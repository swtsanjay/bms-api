import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';

declare global {
    var appRoot: string;
    var knexInstance: Knex;

    type GTypeAll = boolean | number | string | null | Array<string> | Record<string, any> | Record<string, any>[];
    interface GPagination {
        page: number;
        limit: number;
        total: number;
        getTotal: boolean;
        withGroup: boolean;
        withOutData: boolean;
        isAll?: boolean;
    }
    type Gextra = GTypeAll | GPagination;
    interface GQueryParams {
        [key: string]: string | number | boolean | undefined;
    }

    interface GError extends Error {
        message: string;
        code?: number;
        data?: GTypeAll
        extra?: Gextra;
    }
    interface GResponse<T, E = GTypeAll> {
        data: T;
        message: string;
        success: boolean;
        code: StatusCodes;
        qdata?: Partial<GPagination & GQueryParams>;
        extra?: E;
    }
}