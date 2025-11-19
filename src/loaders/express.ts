import bodyParser from 'body-parser';
import cors from 'cors';
import { Application, Request as ExpressRequest, Response as ExpressResponse, NextFunction as ExpressNextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import morgan from 'morgan';
import Response from '../lib/api-response';
import adminRoutes from '../api/admin/index';
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
	app.use(cors({ origin: '*' }));

	// Some sauce that always add since 2014
	// "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
	// Maybe not needed anymore ?
	// app.use(methodOverride());

	// Middleware that transforms the raw string of req.body into json
	app.use(bodyParser.json({ limit: '100mb', type: 'application/json' }));

	// Load API routes
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