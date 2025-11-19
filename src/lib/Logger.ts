import _ from 'lodash';
import winston, { Logger as WinstonLogger, transport } from 'winston';
import 'winston-daily-rotate-file';
import Config from '../config/index';

let LoggerInstance: WinstonLogger | null = null;

const stringifyProperties = (info: Record<string, any>): string => {
	const skip = ['message', 'timestamp', 'level'];
	let response = '';

	for (const key in info) {
		if (Object.prototype.hasOwnProperty.call(info, key)) {
			const value = info[key];
			if (!skip.includes(key) && value) {
				response += `${key}=${value}`;
			}
		}
	}

	return response;
};

interface LoggerInitOptions {
	transports?: transport[];
	level?: string;
	defaultMeta?: Record<string, any>;
}

class Logger {
	static init({
		transports = [],
		level = 'info',
		defaultMeta = {},
	}: LoggerInitOptions = {}): void {
		if (!_.isArray(transports)) {
			throw new Error('transports is not an array');
		}

		if (!Object.keys(winston.config.npm.levels).includes(level)) {
			throw new Error('invalid level');
		}

		if (!_.isObject(defaultMeta) || _.isArray(defaultMeta)) {
			throw new Error('invalid default meta');
		}

		if (_.isEmpty(transports)) {
			if (false && Config.IsLocal) {
				transports.push(
					new winston.transports.Console({
						format: winston.format.combine(
							winston.format.cli(),
							winston.format.simple(),
						),
					}),
				);
			} else {
				const fileTransport = new winston.transports.DailyRotateFile({
					filename: `${Config.logDir}/app.%DATE%.log`,
					datePattern: 'YYYY-MM-DD-HH',
					zippedArchive: true,
					handleExceptions: true,
					json: true,
					maxSize: '20m',
					maxFiles: '15d',
					format: winston.format.json(),
				});
				transports.push(fileTransport);
			}
		}

		const loggerLevels = {
			fatal: 0,
			alert: 1,
			error: 2,
			warning: 3,
			info: 4,
			debug: 5,
			trace: 6,
		};

		LoggerInstance = winston.createLogger({
			level: level || 'info',
			levels: loggerLevels,
			format: winston.format.combine(
				winston.format.timestamp({
					format: 'YYYY-MM-DD HH:mm:ss',
					alias: '@timestamp',
				}),
				winston.format.errors({ stack: true }),
				winston.format.splat(),
				winston.format.json(),
				winston.format.printf(
					info =>
						`@ ${info.timestamp} - ${info.level}: ${info.message} ${stringifyProperties(info)}`,
				),
			),
			transports,
			defaultMeta,
		});
	}

	static log(level: string, message: string, meta: Record<string, any> = {}): void {
		if (!_.isObject(meta)) {
			meta = { meta };
		} else if (meta.message) {
			message += ' ';
		}

		LoggerInstance?.log(level, message, meta);
	}

	static info(message: string, meta: Record<string, any> = {}): void {
		Logger.log('info', message, meta);
	}

	static error(message: string, meta: Record<string, any> = {}): void {
		Logger.log('error', message, meta);
	}
}

export default Logger;
