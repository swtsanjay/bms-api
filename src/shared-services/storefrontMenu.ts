import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../lib/api-response';
import pagination from '../lib/pagination';
import { StorefrontPageStatus } from '../types/storefrontPage';
import { StorefrontMenu, StorefrontMenuPage, StorefrontMenuWithPages } from '../types/storefrontMenu';

type MenuPayload = Partial<StorefrontMenu>;

type MenuListQuery = Partial<StorefrontMenu> & Partial<GPagination> & {
    search?: string;
};

type MenuPageInput = {
    storefront_page_id?: number | string | null;
    label?: string | null;
    sort_order?: number;
};

function buildPaginationQuery(query: Partial<Record<keyof GPagination, unknown>>): GPagination {
    return {
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
        getTotal: query.getTotal === undefined ? true : Boolean(query.getTotal),
        isAll: query.isAll ? Boolean(query.isAll) : false,
        withGroup: query.withGroup ? Boolean(query.withGroup) : false,
        withOutData: query.withOutData ? Boolean(query.withOutData) : false,
        total: query.total ? Number(query.total) : 0
    };
}

function slugify(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function getStatus(status: unknown, fallback: StorefrontPageStatus = 'active'): StorefrontPageStatus {
    if (status === undefined || status === null || status === '') return fallback;
    if (status === 'active' || status === 'inactive') return status;
    throw Response.createError({
        message: 'Menu status must be active or inactive',
        code: StatusCodes.UNPROCESSABLE_ENTITY,
        name: 'StorefrontMenuStatusInvalid'
    });
}

async function resolveHandle(
    trx: Knex.Transaction,
    rawHandle: string,
    currentMenuId: number | null,
    allowSuffix: boolean
) {
    const baseHandle = slugify(rawHandle);
    if (!baseHandle) {
        throw Response.createError({
            message: 'Menu handle is required',
            code: StatusCodes.UNPROCESSABLE_ENTITY,
            name: 'StorefrontMenuHandleRequired'
        });
    }

    let handle = baseHandle;
    let suffix = 2;
    while (true) {
        const query = trx('storefront_menus').select('id').where({ handle }).whereNull('deleted_at');
        if (currentMenuId) query.whereNot({ id: currentMenuId });
        const existing = await query.first() as { id: number } | undefined;
        if (!existing) return handle;
        if (!allowSuffix) {
            throw Response.createError({
                message: 'Menu handle already exists',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'StorefrontMenuHandleExists'
            });
        }
        handle = `${baseHandle}-${suffix}`;
        suffix += 1;
    }
}

export default class SharedStorefrontMenuService {
    static async list(
        query: MenuListQuery,
        trx: Knex.Transaction | null = null
    ): Promise<{ data: StorefrontMenu[], status: boolean, extra: GPagination }> {
        const paginationQuery = buildPaginationQuery(query);
        const dbQuery = knexInstance('storefront_menus')
            .select('*')
            .whereNull('deleted_at')
            .orderBy('sort_order', 'asc')
            .orderBy('id', 'desc');

        if (query.status) dbQuery.where('status', getStatus(query.status));
        if (query.search) {
            const search = String(query.search).trim();
            dbQuery.where((builder) => {
                builder.where('title', 'like', `%${search}%`).orWhere('handle', 'like', `%${search}%`);
            });
        }
        if (trx) dbQuery.transacting(trx);

        const { data, extra } = await pagination<StorefrontMenu>(dbQuery, paginationQuery);
        return { data, status: true, extra };
    }

    static async details(id: number, trx: Knex.Transaction | null = null): Promise<StorefrontMenu | null> {
        const query = knexInstance('storefront_menus').select('*').where({ id }).whereNull('deleted_at');
        if (trx) query.transacting(trx);
        return await query.first() as StorefrontMenu | null;
    }

    static async save(data: MenuPayload, trx: Knex.Transaction): Promise<StorefrontMenu> {
        const now = new Date();
        const existing = data.id
            ? await trx('storefront_menus').where({ id: data.id }).whereNull('deleted_at').first() as StorefrontMenu | undefined
            : undefined;
        if (data.id && !existing) {
            throw Response.createError({
                message: 'Menu not found',
                code: StatusCodes.NOT_FOUND,
                name: 'StorefrontMenuNotFound'
            });
        }

        const title = String(data.title ?? existing?.title ?? '').trim();
        if (!title) {
            throw Response.createError({
                message: 'Menu title is required',
                code: StatusCodes.UNPROCESSABLE_ENTITY,
                name: 'StorefrontMenuTitleRequired'
            });
        }

        const incomingHandle = data.handle === undefined || data.handle === null ? '' : String(data.handle).trim();
        const payload = {
            title,
            handle: data.id
                ? incomingHandle
                    ? await resolveHandle(trx, incomingHandle, Number(data.id), false)
                    : existing?.handle || await resolveHandle(trx, title, Number(data.id), true)
                : await resolveHandle(trx, incomingHandle || title, null, !incomingHandle),
            status: getStatus(data.status, existing?.status || 'active'),
            sort_order: data.sort_order === undefined ? existing?.sort_order || 0 : Number(data.sort_order),
            updated_at: now
        };

        if (data.id) {
            await trx('storefront_menus').where({ id: data.id }).update(payload);
            return await trx('storefront_menus').where({ id: data.id }).first() as StorefrontMenu;
        }

        const [id] = await trx('storefront_menus').insert({ ...payload, created_at: now }) as [number];
        return await trx('storefront_menus').where({ id }).first() as StorefrontMenu;
    }

    static async delete(id: number, trx: Knex.Transaction): Promise<number> {
        await SharedStorefrontMenuService.ensureMenuExists(id, trx);
        await trx('storefront_menus').where({ id }).update({ deleted_at: new Date() });
        return id;
    }

    static normalizePages(body: { pages?: MenuPageInput[] } | MenuPageInput[]): MenuPageInput[] {
        const source = Array.isArray(body) ? body : body.pages;
        return Array.isArray(source) ? source : [];
    }

    static async listPages(menuId: number): Promise<StorefrontMenuPage[]> {
        const rows = await knexInstance('storefront_menu_pages as smp')
            .select(
                'smp.*',
                'sp.title as page_title',
                'sp.slug as page_slug',
                'sp.description as page_description',
                'sp.hero_image_url as page_hero_image_url',
                'sp.status as page_status',
                'sp.sort_order as page_sort_order'
            )
            .leftJoin('storefront_pages as sp', 'smp.storefront_page_id', 'sp.id')
            .where('smp.storefront_menu_id', menuId)
            .whereNull('sp.deleted_at')
            .orderBy('smp.sort_order', 'asc')
            .orderBy('smp.id', 'asc');

        return rows.map((row: Record<string, unknown>) => ({
            id: Number(row.id),
            storefront_menu_id: Number(row.storefront_menu_id),
            storefront_page_id: Number(row.storefront_page_id),
            label: row.label as string | null,
            sort_order: Number(row.sort_order),
            created_at: row.created_at as Date | string | undefined,
            page: {
                id: Number(row.storefront_page_id),
                title: String(row.page_title || ''),
                slug: String(row.page_slug || ''),
                description: row.page_description as string | null,
                hero_image_url: row.page_hero_image_url as string | null,
                status: (row.page_status || 'active') as StorefrontPageStatus,
                sort_order: Number(row.page_sort_order || 0)
            }
        }));
    }

    static async replacePages(menuId: number, pages: MenuPageInput[], trx: Knex.Transaction): Promise<StorefrontMenuPage[]> {
        await SharedStorefrontMenuService.ensureMenuExists(menuId, trx);
        await trx('storefront_menu_pages').where({ storefront_menu_id: menuId }).del();

        const normalized = pages
            .map((page, index) => ({
                storefront_page_id: Number(page.storefront_page_id),
                label: page.label ? String(page.label).trim() : null,
                sort_order: Number.isFinite(Number(page.sort_order)) ? Number(page.sort_order) : index + 1
            }))
            .filter((page) => Number.isFinite(page.storefront_page_id) && page.storefront_page_id > 0);

        if (normalized.length) {
            await trx('storefront_menu_pages').insert(normalized.map((page) => ({
                storefront_menu_id: menuId,
                storefront_page_id: page.storefront_page_id,
                label: page.label,
                sort_order: page.sort_order,
                created_at: new Date()
            })));
        }

        return await SharedStorefrontMenuService.listPages(menuId);
    }

    static async activeMenusWithPages(): Promise<StorefrontMenuWithPages[]> {
        const menus = await knexInstance('storefront_menus')
            .select('*')
            .where({ status: 'active' })
            .whereNull('deleted_at')
            .orderBy('sort_order', 'asc')
            .orderBy('id', 'asc') as StorefrontMenu[];

        const data: StorefrontMenuWithPages[] = [];
        for (const menu of menus) {
            const pages = (await SharedStorefrontMenuService.listPages(menu.id))
                .filter((item) => item.page?.status === 'active');
            if (pages.length) {
                data.push({ ...menu, pages });
            }
        }
        return data;
    }

    private static async ensureMenuExists(id: number, trx: Knex.Transaction | null = null) {
        const menu = await SharedStorefrontMenuService.details(id, trx);
        if (!menu) {
            throw Response.createError({
                message: 'Menu not found',
                code: StatusCodes.NOT_FOUND,
                name: 'StorefrontMenuNotFound'
            });
        }
    }
}
