import express, { Express } from 'express';
import { Server } from 'http';
import path from 'path';
import config from './config';
import Logger from './lib/Logger';
import initLoader from './loaders/index';
Logger.init({ level: config.logs.level });

global.appRoot = path.resolve(__dirname);


process.on('uncaughtException', (error: Error) => {
	console.log(error.message);
});

(async () => {
	try {
		const app: Express = express();
		app.use(express.static(path.join(__dirname, '..', 'public')));
		app.use(express.json({ limit: '100mb', type: 'application/json' }));
		const server: Server = app.listen(config.port, (err?: Error) => {
			if (err) {
				console.log(err.message);
				process.exit(1);
				return;
			}
			console.log(`Server started on port ${config.port}`);
		});
		await initLoader({ expressApp: app, server });
	} catch (e: any) {
		Logger.error(`🔴 Failed to run the project due to '${e.message}'`);
		throw new Error(e);
	}
})();
