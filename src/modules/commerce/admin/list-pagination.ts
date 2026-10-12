export const ADMIN_LIST_PAGE_SIZE = 20;
const MAX_PAGE = 100_000;

export function parseAdminListPage(value: unknown): number | null {
    if (value === undefined) return 1;
    if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) return null;
    const page = Number(value);
    return Number.isSafeInteger(page) && page <= MAX_PAGE ? page : null;
}

export function adminListPageInfo(page: number, total: number) {
    const totalPages = Math.ceil(total / ADMIN_LIST_PAGE_SIZE);
    return {
        page,
        page_size: ADMIN_LIST_PAGE_SIZE,
        total,
        total_pages: totalPages,
        has_previous: page > 1,
        has_next: page < totalPages
    };
}
