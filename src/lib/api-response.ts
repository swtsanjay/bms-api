import { Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import _ from 'lodash';
import config from './../config';
export default class Response {
	static success<T>(
		res: ExpressResponse,
		message: string | GResponse<T>,
		data?: T | null,
		code?: StatusCodes,
		extra?: Gextra,
		qdata?: Partial<GPagination & GQueryParams>
	): GResponse<T> {
		if (res.req.transaction && !res.req.transaction.isCompleted()) {
			res.req.transaction.commit().then(() => {}).catch(() => {});
		}
		const resObj: GResponse<T> = {
			success: true,
			message: '',
			code: StatusCodes.OK,
			data: null as T,
			extra: null,
			qdata: {}
		};

		if (typeof message === 'string') {
			resObj.data = (data ?? null) as T;
			resObj.code = code || StatusCodes.OK;
			resObj.extra = extra || null;
			resObj.qdata = qdata;
		} else {
			resObj.message = message.message || 'success';
			resObj.data = (message.data ?? null) as T;
			resObj.code = message.code || StatusCodes.OK;
			resObj.success = message.success;
			resObj.extra = message.extra || null;
			resObj.qdata = message.qdata;
		}

		if (res.req.headers.json) {
			res
				.status(resObj.code)
				.type('json')
				.send(`${JSON.stringify(resObj, null, 2)}\n`);
		} else {
			res.status(resObj.code).json(resObj);
		}
		return resObj;
	}

	static fail<T>(
		res: ExpressResponse,
		message: string | GError | GResponse<T>,
		data?: T | null,
		code?: StatusCodes,
		extra?: Gextra
	): GResponse<T> {
		if (res.req.transaction && !res.req.transaction.isCompleted()) {
			res.req.transaction.rollback().then(() => {}).catch(() => {});
		}
		const resObj: GResponse<T> = {
			success: false,
			message: '',
			code: StatusCodes.INTERNAL_SERVER_ERROR,
			data: null as T,
			extra: null
		};

		if (typeof message === 'string') {
			resObj.data = (data ?? null) as T;
			resObj.code = code || StatusCodes.INTERNAL_SERVER_ERROR;
			resObj.extra = extra;
		} else if ('success' in message) {
			resObj.message = message.message || 'fail';
			resObj.data = (data ?? null) as T;
			resObj.code = message.code || StatusCodes.INTERNAL_SERVER_ERROR;
			resObj.extra = message.extra || null;
		} else {
			resObj.message = message.message || 'fail';
			resObj.data = (data ?? null) as T;
			resObj.code = message.code || StatusCodes.INTERNAL_SERVER_ERROR;
			resObj.extra = message.extra || null;
		}

		if (res.req.headers.json) {
			res
				.status(resObj.code)
				.type('json')
				.send(`${JSON.stringify(resObj, null, 2)}\n`);
		} else {
			res.status(resObj.code).json(resObj);
		}
		return resObj;
	}
	static createError(
		customErr: GError,
		systemError: GError | Error | null = null
	): GError {
		let e = new Error(customErr.message);
		(e as GError).code = customErr.code || StatusCodes.UNPROCESSABLE_ENTITY;
		(e as GError).name = customErr.name || 'CustomError';
		(e as GError).data = customErr.data || null;
		(e as GError).extra = customErr.extra || null;
		if (systemError && config.IsLocal) {
			let e = new Error(systemError.message);
			(e as GError).name = systemError.name || 'CustomError';
			if('code' in systemError) {
				(e as GError).code = systemError.code || StatusCodes.UNPROCESSABLE_ENTITY;
				(e as GError).data = systemError.data || null;
				(e as GError).extra = systemError.extra || null;
			}
			return e;
		}
		return e;
	}
}