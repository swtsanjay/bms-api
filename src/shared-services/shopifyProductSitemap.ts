type SitemapProductRow = {
    title: string;
    handle: string;
    updated_at: Date | string;
};

export default class SharedShopifyProductSitemapService {
    static async list(): Promise<SitemapProductRow[]> {
        return await knexInstance('shopify_products')
            .select(
                'title',
                knexInstance.raw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.handle')) as handle"),
                knexInstance.raw('COALESCE(shopify_updated_at, updated_at) as updated_at')
            )
            // .whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.status')) = ?", ['active'])
            .whereNotNull('title')
            // .whereRaw("JSON_UNQUOTE(JSON_EXTRACT(meta, '$.handle')) IS NOT NULL")
            .orderBy('created_at', 'desc')
            .limit(200) as SitemapProductRow[];
    }
}
