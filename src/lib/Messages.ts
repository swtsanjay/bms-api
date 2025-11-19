
import { StatusCodes } from 'http-status-codes';
export const Message: {
    [key: string]: {
        code: StatusCodes;
        message: string;
        name: string;
    };
} = {
    ok: {
        code: StatusCodes.OK,
        message: 'ok',
        name: 'OK'
    },
    formValidationError: {
        code: StatusCodes.UNPROCESSABLE_ENTITY,
        message: 'Data is not valid',
        name: 'ExpressValidatorError'
    },
    internalServalError: {
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Internal Serval Error',
        name: 'InternalServalError'
    },
    // accountDeleted: {
    //     code: StatusCodes.OK,
    //     message: 'Account deleted successfully',
    //     name: 'accountDeleted'
    // },
    dataSaved: {
        code: StatusCodes.OK,
        message: 'Data Saved Successfully',
        name: 'DataSaved'
    },
    dataNotSaved: {
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Data failed to save',
        name: 'DataNotSaved'
    },
    dataFound: {
        code: StatusCodes.OK,
        message: 'Data found',
        name: 'DataFound'
    },
    dataNotFound: {
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: 'Data not found',
        name: 'DataNotFound'
    },
};