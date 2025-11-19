import { Knex } from 'knex';


export default async function pagination<T>(queryObj: Knex.QueryBuilder, extra: GPagination): Promise<{ data: T[], extra: GPagination }> {
    const response: { data: T[], extra: GPagination } = {
        data: [], extra: {
            page: Number(extra.page) * 1 > 0 ? Number(extra.page) * 1 : 1,
            limit: Number(extra.limit) * 1 > 0 ? Number(extra.limit) * 1 : 20,
            total: extra.getTotal ? 1 : 0 ,
            getTotal: Boolean(extra.getTotal),
            withGroup: Boolean(extra.withGroup),
            withOutData: Boolean(extra.withOutData),
        }
    };
    if (extra.isAll) {
        response.extra.getTotal = false;
    }
    if (extra.withOutData) {
        response.extra.getTotal = true;
    }
    if (!extra.getTotal) {
        response.extra.getTotal = false;
    }
    if (response.extra.getTotal) {
        if (response.extra.withGroup) {
            response.extra.total = Number((await knexInstance(queryObj.clone().clearSelect().clearOrder().count('* as total').as('grouped_sales')).count('* as total').first())?.total) ?? 0;
        } else {
            response.extra.total = (await queryObj.clone().clearSelect().clearOrder().count('* as total').first())?.total || 0;
        }
    }
    if (extra.withOutData) {
        return response;
    } else {
        if (!extra.isAll) {
            const offSet = Number(response.extra.limit) * (Number(response.extra.page) - 1);
            response.data = await queryObj.limit(Number(response.extra.limit)).offset(offSet);
        } else {
            response.data = await queryObj;
            response.extra.limit = response.data.length;
            response.extra.total = response.data.length;
        }

    }

    return response;
}