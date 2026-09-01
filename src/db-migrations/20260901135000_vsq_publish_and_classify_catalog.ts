import crypto from 'crypto';
import type { Knex } from 'knex';

type TaxonomySeed = {
    slug: string;
    label: string;
    description: string;
};

const audienceCategories: TaxonomySeed[] = [
    { slug: 'men', label: 'Men', description: "Clothing designed for men." },
    { slug: 'women', label: 'Women', description: "Clothing designed for women." },
    { slug: 'kids', label: 'Kids', description: "Clothing designed for children." }
];

const productTypeCategories: TaxonomySeed[] = [
    { slug: 't-shirts', label: 'T-Shirts', description: 'Crew neck, V-neck, oversized and casual T-shirts.' },
    { slug: 'shirts', label: 'Shirts', description: 'Casual, office and everyday shirts.' },
    { slug: 'tops', label: 'Tops', description: 'Casual tops, crop tops and tunics.' },
    { slug: 'dresses', label: 'Dresses', description: 'Casual, midi and occasion dresses.' },
    { slug: 'ethnic-wear', label: 'Ethnic Wear', description: 'Kurtis, kurtas and coordinated ethnic sets.' },
    { slug: 'bottoms', label: 'Bottoms', description: 'Pants and other bottom wear.' },
    { slug: 'co-ord-sets', label: 'Co-ord Sets', description: 'Coordinated clothing sets.' },
    { slug: 'nightwear', label: 'Nightwear', description: 'Night suits and sleepwear.' }
];

const collections: TaxonomySeed[] = [
    { slug: 'all-products', label: 'All Products', description: 'The complete active Vastriqo catalog.' },
    { slug: 'mens-collection', label: "Men's Collection", description: "Vastriqo clothing for men." },
    { slug: 'womens-collection', label: "Women's Collection", description: "Vastriqo clothing for women." },
    { slug: 'kids-collection', label: "Kids' Collection", description: "Vastriqo clothing for children." }
];

function typeCategory(title: string, productType: string) {
    const value = `${title} ${productType}`.toLowerCase();
    if (/night\s*suit|nightwear|sleepwear/.test(value)) return 'nightwear';
    if (/co[ -]?ord/.test(value)) return 'co-ord-sets';
    if (/kurti|kurta/.test(value)) return 'ethnic-wear';
    if (/\bpants?\b|trousers?|bottoms?/.test(value)) return 'bottoms';
    if (/\bdress\b/.test(value)) return 'dresses';
    if (/t[ -]?shirt/.test(value)) return 't-shirts';
    if (/\bshirt\b/.test(value)) return 'shirts';
    if (/\btop\b|\btunic\b/.test(value)) return 'tops';
    return null;
}

function audienceSlugs(title: string, gender: string) {
    const normalizedTitle = title.toLowerCase();
    const normalizedGender = gender.toLowerCase();
    if (/\bkids?\b|\bgirls?\b|\bboys?\b/.test(normalizedTitle)) return ['kids'];

    const result = new Set<string>();
    if (/\bmale\b/.test(normalizedGender) || /\bmen(?:'s|s)?\b/.test(normalizedTitle)) result.add('men');
    if (/\bfemale\b/.test(normalizedGender) || /\bwomen(?:'s|s)?\b/.test(normalizedTitle)) result.add('women');
    if (/\bunisex\b/.test(normalizedGender)) {
        result.add('men');
        result.add('women');
    }
    return [...result];
}

async function ensureCategory(knex: Knex, seed: TaxonomySeed, sortOrder: number) {
    let row = await knex('vsq_categories').where({ slug: seed.slug }).first();
    if (!row) {
        const [id] = await knex('vsq_categories').insert({
            public_id: crypto.randomUUID(),
            slug: seed.slug,
            name: seed.label,
            description: seed.description,
            status: 'ACTIVE',
            sort_order: sortOrder,
            created_at: new Date(),
            updated_at: new Date()
        });
        row = await knex('vsq_categories').where({ id }).first();
    } else if (row.status !== 'ACTIVE') {
        await knex('vsq_categories').where({ id: row.id }).update({ status: 'ACTIVE', updated_at: new Date() });
    }
    return row;
}

async function ensureCollection(knex: Knex, seed: TaxonomySeed) {
    let row = await knex('vsq_collections').where({ slug: seed.slug }).first();
    if (!row) {
        const [id] = await knex('vsq_collections').insert({
            public_id: crypto.randomUUID(),
            slug: seed.slug,
            title: seed.label,
            description: seed.description,
            kind: 'MANUAL',
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date()
        });
        row = await knex('vsq_collections').where({ id }).first();
    } else if (row.status !== 'ACTIVE') {
        await knex('vsq_collections').where({ id: row.id }).update({ status: 'ACTIVE', updated_at: new Date() });
    }
    return row;
}

export async function up(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        const now = new Date();
        if (await trx.schema.hasColumn('vsq_products', 'source_status')) {
            await trx('vsq_products')
                .whereRaw('LOWER(source_status) = ?', ['active'])
                .update({
                    status: 'ACTIVE',
                    published_at: trx.raw('COALESCE(published_at, ?)', [now]),
                    updated_at: now
                });
        }

        const categoryBySlug = new Map<string, Record<string, unknown>>();
        for (const [index, seed] of [...audienceCategories, ...productTypeCategories].entries()) {
            categoryBySlug.set(seed.slug, await ensureCategory(trx, seed, index));
        }

        const collectionBySlug = new Map<string, Record<string, unknown>>();
        for (const seed of collections) collectionBySlug.set(seed.slug, await ensureCollection(trx, seed));

        const products = await trx('vsq_products as p')
            .leftJoin('vsq_product_metafields as mf', function () {
                this.on('mf.product_id', '=', 'p.id').andOn('mf.metafield_key', '=', trx.raw('?', ['target-gender']));
            })
            .select('p.id', 'p.title', 'p.product_type', 'mf.value_json as target_gender')
            .whereNull('p.deleted_at');

        for (const [position, product] of products.entries()) {
            const audiences = audienceSlugs(String(product.title || ''), String(product.target_gender || ''));
            const type = typeCategory(String(product.title || ''), String(product.product_type || ''));
            const categorySlugs = [...audiences, ...(type ? [type] : [])];

            for (const [categoryPosition, slug] of categorySlugs.entries()) {
                const category = categoryBySlug.get(slug);
                if (!category) continue;
                await trx('vsq_product_categories').insert({
                    product_id: product.id,
                    category_id: category.id,
                    is_primary: categoryPosition === 0,
                    sort_order: categoryPosition
                }).onConflict(['product_id', 'category_id']).ignore();
            }

            const collectionSlugs = new Set(['all-products']);
            if (audiences.includes('men')) collectionSlugs.add('mens-collection');
            if (audiences.includes('women')) collectionSlugs.add('womens-collection');
            if (audiences.includes('kids')) collectionSlugs.add('kids-collection');
            for (const slug of collectionSlugs) {
                const collection = collectionBySlug.get(slug);
                if (!collection) continue;
                await trx('vsq_collection_products').insert({
                    collection_id: collection.id,
                    product_id: product.id,
                    sort_order: position
                }).onConflict(['collection_id', 'product_id']).ignore();
            }
        }
    });
}

export async function down(knex: Knex): Promise<void> {
    const categorySlugs = [...audienceCategories, ...productTypeCategories].map((item) => item.slug);
    const collectionSlugs = collections.map((item) => item.slug);
    await knex('vsq_collection_products').whereIn('collection_id', knex('vsq_collections').select('id').whereIn('slug', collectionSlugs)).delete();
    await knex('vsq_product_categories').whereIn('category_id', knex('vsq_categories').select('id').whereIn('slug', categorySlugs)).delete();
    await knex('vsq_collections').whereIn('slug', collectionSlugs).delete();
    await knex('vsq_categories').whereIn('slug', categorySlugs).delete();
}
