import bodyParser from 'body-parser';
import cors from 'cors';
import { Application, Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import morgan from 'morgan';
import Response from '../lib/api-response';
import adminRoutes from '../api/admin/index';
import frontRoutes from '../api/front/index';
import newsletterRoutes from '../api/front/modules/newsletter/route';
// import rateLimiter from '../shared-services/middleware/rateLimiter';
export default ({ app }: { app: Application }) => {
	/*
	|--------------------------------------------------------------------------
	| Heroku, Bluemix, AWS ELB, Nginx, etc
	|--------------------------------------------------------------------------
	|
	| Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
	| It shows the real origin IP in the heroku or Cloudwatch logs
	|
	*/
	app.set('trust proxy', true);

	// HTTP request logger
	app.use(morgan('dev'));

	// The magic package that prevents frontend developers going nuts
	// Alternate description:
	// Enable Cross Origin Resource Sharing to all origins by default
	const configuredOrigins = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
		.split(',')
		.map((origin) => origin.trim().replace(/\/$/, ''))
		.filter(Boolean);
	const defaultOrigins = [
		'http://localhost:3000',
		'http://127.0.0.1:3000',
		'http://localhost:5173',
		'http://127.0.0.1:5173',
		'https://vastriqo.com',
		'https://www.vastriqo.com'
	];
	const allowedOrigins = new Set(configuredOrigins.length ? configuredOrigins : defaultOrigins);
	const isAllowedLocalOrigin = (origin: string) => (
		process.env.NODE_ENV === 'local'
		&& /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
	);
	app.use(cors({
		credentials: true,
		origin(origin, callback) {
			if (!origin || allowedOrigins.has(origin) || isAllowedLocalOrigin(origin)) {
				return callback(null, true);
			}
			return callback(new Error(`Origin ${origin} is not allowed by CORS`));
		}
	}));

	// Some sauce that always add since 2014
	// "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
	// Maybe not needed anymore ?
	// app.use(methodOverride());

	// Middleware that transforms the raw string of req.body into json
	app.use(bodyParser.json({ limit: '100mb', type: 'application/json' }));

	// Load API routes
	app.use('/newsletter', newsletterRoutes);
	app.use('/front/', frontRoutes);
	app.use('/admin/', adminRoutes);

	// catch 404 and forward to error handler
	app.use((req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
		if (req.transaction && !req.transaction.isCompleted()) {
			req.transaction.rollback().then(() => { }).catch(() => { });
		}
		const err: GError = new Error(`Route ${req.url} Not Found`);
		err.code = StatusCodes.NOT_FOUND;
		next(err);
	});

	// error handlers
	app.use((
		(err: GError, req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
			if (req.transaction && !req.transaction.isCompleted()) {
				req.transaction.rollback().then(() => { }).catch(() => { });
			}
			/*
			 * Handle 401 thrown by express-jwt library
			 */
			if (err.name === 'UnauthorizedError') {
				return Response.fail(res, err.message, null, StatusCodes.INTERNAL_SERVER_ERROR);
			}

			/*
			 * Handle multer error
			 */
			if (err.name === 'MulterError') {
				return Response.fail(res, err.message, StatusCodes.INTERNAL_SERVER_ERROR);
			}
			return Response.fail(res, err.message, null, err.code || StatusCodes.NOT_FOUND, err.extra);
		}
	) as (
		err: Error,
		req: ExpressRequest,
		res: ExpressResponse,
		next: ExpressNextFunction
	) => void);
};
