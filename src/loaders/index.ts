import { Express } from 'express';
import { Server } from 'http';
import knex from './knex';
import expressLoader from './express';
import Logger from '../lib/Logger';
import { connectToRedis } from './redis';
require('../types/global');
interface LoaderParams {
	expressApp: Express;
	server?: Server;
}

const loader = async function ({ expressApp }: LoaderParams): Promise<void> {
	global.knexInstance = await knex.connect();
	Logger.info('🟢 Database Connected Successfully !!');
	console.log('✌️ Database Connected Successfully !!');

	await expressLoader({ app: expressApp });
	Logger.info('🟢 Express App initialsed !!');

	// await connectToRedis();
	// Logger.info('🟢 Redis Client Connected Successfully');

};

export default loader;