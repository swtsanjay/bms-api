import type { Knex } from 'knex';

function timestamps(table: Knex.CreateTableBuilder, knex: Knex) {
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
}

function publicId(table: Knex.CreateTableBuilder) {
    table.string('public_id', 36).notNullable().unique();
}

function money(table: Knex.CreateTableBuilder, name: string, defaultValue = 0) {
    table.decimal(name, 19, 4).notNullable().defaultTo(defaultValue);
}

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_tax_categories', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('code', 80).notNullable().unique();
        table.string('name', 150).notNullable();
        table.string('hsn_sac', 20).nullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        timestamps(table, knex);
        table.index(['status'], 'vsq_tc_status_idx');
        table.index(['hsn_sac'], 'vsq_tc_hsn_idx');
    });

    await knex.schema.createTable('vsq_customers', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('email', 191).notNullable();
        table.string('email_normalized', 191).notNullable().unique();
        table.string('phone', 30).nullable();
        table.string('phone_normalized', 30).nullable().unique();
        table.string('first_name', 100).nullable();
        table.string('last_name', 100).nullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        table.timestamp('email_verified_at').nullable();
        table.timestamp('phone_verified_at').nullable();
        table.timestamp('last_login_at').nullable();
        table.timestamp('deleted_at').nullable();
        table.integer('version').unsigned().notNullable().defaultTo(1);
        timestamps(table, knex);
        table.index(['status', 'created_at'], 'vsq_c_status_created_idx');
    });

    await knex.schema.createTable('vsq_customer_credentials', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('password_hash', 255).notNullable();
        table.timestamp('password_changed_at').notNullable().defaultTo(knex.fn.now());
        table.integer('failed_login_count').unsigned().notNullable().defaultTo(0);
        table.timestamp('locked_until').nullable();
        timestamps(table, knex);
        table.unique(['customer_id'], 'vsq_cc_customer_uq');
        table.foreign('customer_id', 'vsq_cc_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('CASCADE');
    });

    await knex.schema.createTable('vsq_customer_sessions', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('refresh_token_hash', 64).notNullable().unique();
        table.string('user_agent', 500).nullable();
        table.string('ip_address', 64).nullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('last_used_at').nullable();
        table.timestamp('revoked_at').nullable();
        table.string('revoked_reason', 150).nullable();
        timestamps(table, knex);
        table.foreign('customer_id', 'vsq_cs_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.index(['customer_id', 'revoked_at'], 'vsq_cs_customer_revoked_idx');
        table.index(['expires_at'], 'vsq_cs_expiry_idx');
    });

    await knex.schema.createTable('vsq_customer_addresses', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('type', 20).notNullable().defaultTo('SHIPPING');
        table.boolean('is_default_shipping').notNullable().defaultTo(false);
        table.boolean('is_default_billing').notNullable().defaultTo(false);
        table.string('first_name', 100).notNullable();
        table.string('last_name', 100).nullable();
        table.string('company', 150).nullable();
        table.string('address_line_1', 255).notNullable();
        table.string('address_line_2', 255).nullable();
        table.string('city', 120).notNullable();
        table.string('state', 120).notNullable();
        table.string('state_code', 20).nullable();
        table.string('postcode', 20).notNullable();
        table.string('country', 120).notNullable().defaultTo('India');
        table.string('country_code', 2).notNullable().defaultTo('IN');
        table.string('phone', 30).nullable();
        table.string('validation_status', 30).notNullable().defaultTo('UNVERIFIED');
        table.timestamp('deleted_at').nullable();
        timestamps(table, knex);
        table.foreign('customer_id', 'vsq_ca_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.index(['customer_id', 'deleted_at'], 'vsq_ca_customer_deleted_idx');
    });

    await knex.schema.createTable('vsq_wishlists', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('customer_id').unsigned().notNullable();
        table.string('name', 150).notNullable().defaultTo('Favorites');
        timestamps(table, knex);
        table.foreign('customer_id', 'vsq_w_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.unique(['customer_id'], 'vsq_w_customer_uq');
    });

    await knex.schema.createTable('vsq_products', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('slug', 191).notNullable().unique();
        table.string('title', 255).notNullable();
        table.text('description_html').nullable();
        table.text('description_text').nullable();
        table.string('vendor', 150).nullable();
        table.string('product_type', 150).nullable();
        table.json('tags').nullable();
        table.string('status', 30).notNullable().defaultTo('DRAFT');
        table.bigInteger('tax_category_id').unsigned().nullable();
        table.boolean('requires_shipping').notNullable().defaultTo(true);
        table.boolean('taxable').notNullable().defaultTo(true);
        table.string('country_of_origin', 2).nullable().defaultTo('IN');
        table.string('seo_title', 255).nullable();
        table.text('seo_description').nullable();
        table.timestamp('published_at').nullable();
        table.timestamp('deleted_at').nullable();
        table.integer('version').unsigned().notNullable().defaultTo(1);
        timestamps(table, knex);
        table.foreign('tax_category_id', 'vsq_p_tax_category_fk')
            .references('id').inTable('vsq_tax_categories').onDelete('SET NULL');
        table.index(['status', 'published_at'], 'vsq_p_status_published_idx');
        table.index(['vendor'], 'vsq_p_vendor_idx');
        table.index(['product_type'], 'vsq_p_type_idx');
    });

    await knex.schema.createTable('vsq_product_options', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('product_id').unsigned().notNullable();
        table.string('name', 100).notNullable();
        table.integer('position').unsigned().notNullable().defaultTo(0);
        timestamps(table, knex);
        table.foreign('product_id', 'vsq_po_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.unique(['product_id', 'name'], 'vsq_po_product_name_uq');
        table.unique(['product_id', 'position'], 'vsq_po_product_pos_uq');
    });

    await knex.schema.createTable('vsq_product_option_values', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('product_option_id').unsigned().notNullable();
        table.string('value', 150).notNullable();
        table.string('swatch_value', 100).nullable();
        table.integer('position').unsigned().notNullable().defaultTo(0);
        timestamps(table, knex);
        table.foreign('product_option_id', 'vsq_pov_option_fk')
            .references('id').inTable('vsq_product_options').onDelete('CASCADE');
        table.unique(['product_option_id', 'value'], 'vsq_pov_option_value_uq');
    });

    await knex.schema.createTable('vsq_product_variants', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('product_id').unsigned().notNullable();
        table.string('title', 255).notNullable();
        table.string('sku', 100).nullable().unique();
        table.string('barcode', 100).nullable().unique();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        table.boolean('requires_shipping').notNullable().defaultTo(true);
        table.boolean('taxable').notNullable().defaultTo(true);
        table.decimal('weight_value', 12, 4).nullable();
        table.string('weight_unit', 10).nullable();
        table.timestamp('deleted_at').nullable();
        table.integer('version').unsigned().notNullable().defaultTo(1);
        timestamps(table, knex);
        table.foreign('product_id', 'vsq_pv_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.index(['product_id', 'status'], 'vsq_pv_product_status_idx');
    });

    await knex.schema.createTable('vsq_wishlist_items', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('wishlist_id').unsigned().notNullable();
        table.bigInteger('product_id').unsigned().notNullable();
        table.bigInteger('variant_id').unsigned().nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('wishlist_id', 'vsq_wi_wishlist_fk')
            .references('id').inTable('vsq_wishlists').onDelete('CASCADE');
        table.foreign('product_id', 'vsq_wi_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.foreign('variant_id', 'vsq_wi_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('SET NULL');
        table.unique(['wishlist_id', 'product_id'], 'vsq_wi_wishlist_product_uq');
    });

    await knex.schema.createTable('vsq_variant_option_values', (table) => {
        table.bigInteger('variant_id').unsigned().notNullable();
        table.bigInteger('product_option_value_id').unsigned().notNullable();
        table.primary(['variant_id', 'product_option_value_id'], 'vsq_vov_pk');
        table.foreign('variant_id', 'vsq_vov_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('CASCADE');
        table.foreign('product_option_value_id', 'vsq_vov_value_fk')
            .references('id').inTable('vsq_product_option_values').onDelete('CASCADE');
    });

    await knex.schema.createTable('vsq_media_assets', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('kind', 30).notNullable().defaultTo('IMAGE');
        table.string('status', 30).notNullable().defaultTo('READY');
        table.string('bucket', 191).nullable();
        table.string('object_key', 1000).nullable();
        table.string('object_version_id', 191).nullable();
        table.specificType(
            'object_identity_hash',
            `char(64) character set ascii generated always as (
                case
                    when bucket is null or object_key is null then null
                    else sha2(concat(bucket, char(0), object_key, char(0), coalesce(object_version_id, '')), 256)
                end
            ) stored`
        );
        table.string('public_url', 1000).nullable();
        table.string('mime_type', 100).nullable();
        table.bigInteger('byte_size').unsigned().nullable();
        table.integer('width').unsigned().nullable();
        table.integer('height').unsigned().nullable();
        table.string('checksum_sha256', 64).nullable();
        table.string('source_url', 1000).nullable();
        table.string('source_system', 40).nullable();
        table.string('source_id', 191).nullable();
        table.string('alt_text', 500).nullable();
        table.timestamp('deleted_at').nullable();
        timestamps(table, knex);
        // Index the deterministic identity instead of the full utf8mb4 columns. The
        // original composite key can exceed InnoDB's 3072-byte index limit.
        table.unique(['object_identity_hash'], 'vsq_ma_object_uq');
        table.index(['checksum_sha256'], 'vsq_ma_checksum_idx');
        table.index(['source_system', 'source_id'], 'vsq_ma_source_idx');
    });

    await knex.schema.createTable('vsq_product_media', (table) => {
        table.bigInteger('product_id').unsigned().notNullable();
        table.bigInteger('media_asset_id').unsigned().notNullable();
        table.string('role', 30).notNullable().defaultTo('GALLERY');
        table.integer('position').unsigned().notNullable().defaultTo(0);
        table.primary(['product_id', 'media_asset_id'], 'vsq_pm_pk');
        table.foreign('product_id', 'vsq_pm_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.foreign('media_asset_id', 'vsq_pm_media_fk')
            .references('id').inTable('vsq_media_assets').onDelete('RESTRICT');
        table.unique(['product_id', 'position'], 'vsq_pm_product_pos_uq');
    });

    await knex.schema.createTable('vsq_variant_media', (table) => {
        table.bigInteger('variant_id').unsigned().notNullable();
        table.bigInteger('media_asset_id').unsigned().notNullable();
        table.integer('position').unsigned().notNullable().defaultTo(0);
        table.primary(['variant_id', 'media_asset_id'], 'vsq_vm_pk');
        table.foreign('variant_id', 'vsq_vm_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('CASCADE');
        table.foreign('media_asset_id', 'vsq_vm_media_fk')
            .references('id').inTable('vsq_media_assets').onDelete('RESTRICT');
        table.unique(['variant_id', 'position'], 'vsq_vm_variant_pos_uq');
    });

    await knex.schema.createTable('vsq_product_metafields', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('product_id').unsigned().notNullable();
        table.string('namespace', 100).notNullable();
        table.string('metafield_key', 100).notNullable();
        table.string('type', 80).notNullable();
        table.json('value_json').notNullable();
        table.boolean('is_filterable').notNullable().defaultTo(false);
        timestamps(table, knex);
        table.foreign('product_id', 'vsq_pmf_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.unique(['product_id', 'namespace', 'metafield_key'], 'vsq_pmf_scope_uq');
        table.index(['namespace', 'metafield_key'], 'vsq_pmf_lookup_idx');
    });

    await knex.schema.createTable('vsq_categories', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('parent_id').unsigned().nullable();
        table.string('slug', 191).notNullable().unique();
        table.string('name', 255).notNullable();
        table.text('description').nullable();
        table.string('status', 30).notNullable().defaultTo('DRAFT');
        table.integer('sort_order').notNullable().defaultTo(0);
        table.string('seo_title', 255).nullable();
        table.text('seo_description').nullable();
        timestamps(table, knex);
        table.foreign('parent_id', 'vsq_cat_parent_fk')
            .references('id').inTable('vsq_categories').onDelete('SET NULL');
        table.index(['parent_id', 'status', 'sort_order'], 'vsq_cat_parent_status_idx');
    });

    await knex.schema.createTable('vsq_product_categories', (table) => {
        table.bigInteger('product_id').unsigned().notNullable();
        table.bigInteger('category_id').unsigned().notNullable();
        table.boolean('is_primary').notNullable().defaultTo(false);
        table.integer('sort_order').notNullable().defaultTo(0);
        table.primary(['product_id', 'category_id'], 'vsq_pc_pk');
        table.foreign('product_id', 'vsq_pc_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.foreign('category_id', 'vsq_pc_category_fk')
            .references('id').inTable('vsq_categories').onDelete('CASCADE');
        table.index(['category_id', 'sort_order'], 'vsq_pc_category_sort_idx');
    });

    await knex.schema.createTable('vsq_collections', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('slug', 191).notNullable().unique();
        table.string('title', 255).notNullable();
        table.text('description').nullable();
        table.string('kind', 30).notNullable().defaultTo('MANUAL');
        table.json('rule_json').nullable();
        table.string('status', 30).notNullable().defaultTo('DRAFT');
        table.string('seo_title', 255).nullable();
        table.text('seo_description').nullable();
        table.timestamp('starts_at').nullable();
        table.timestamp('ends_at').nullable();
        timestamps(table, knex);
        table.index(['status', 'starts_at', 'ends_at'], 'vsq_col_active_idx');
    });

    await knex.schema.createTable('vsq_collection_products', (table) => {
        table.bigInteger('collection_id').unsigned().notNullable();
        table.bigInteger('product_id').unsigned().notNullable();
        table.integer('sort_order').notNullable().defaultTo(0);
        table.primary(['collection_id', 'product_id'], 'vsq_cp_pk');
        table.foreign('collection_id', 'vsq_cp_collection_fk')
            .references('id').inTable('vsq_collections').onDelete('CASCADE');
        table.foreign('product_id', 'vsq_cp_product_fk')
            .references('id').inTable('vsq_products').onDelete('CASCADE');
        table.index(['collection_id', 'sort_order'], 'vsq_cp_collection_sort_idx');
    });

    await knex.schema.createTable('vsq_inventory_locations', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('code', 80).notNullable().unique();
        table.string('name', 150).notNullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        table.integer('priority').notNullable().defaultTo(0);
        table.json('address_json').nullable();
        timestamps(table, knex);
        table.index(['status', 'priority'], 'vsq_il_status_priority_idx');
    });

    await knex.schema.createTable('vsq_inventory_levels', (table) => {
        table.bigInteger('variant_id').unsigned().notNullable();
        table.bigInteger('location_id').unsigned().notNullable();
        table.integer('on_hand').notNullable().defaultTo(0);
        table.integer('reserved').notNullable().defaultTo(0);
        table.integer('safety_stock').notNullable().defaultTo(0);
        table.integer('version').unsigned().notNullable().defaultTo(1);
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.primary(['variant_id', 'location_id'], 'vsq_inv_level_pk');
        table.foreign('variant_id', 'vsq_invl_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('CASCADE');
        table.foreign('location_id', 'vsq_invl_location_fk')
            .references('id').inTable('vsq_inventory_locations').onDelete('CASCADE');
    });

    await knex.schema.createTable('vsq_inventory_movements', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('variant_id').unsigned().notNullable();
        table.bigInteger('location_id').unsigned().notNullable();
        table.string('type', 40).notNullable();
        table.integer('quantity_delta').notNullable();
        table.integer('balance_after').notNullable();
        table.string('reference_type', 80).nullable();
        table.string('reference_id', 100).nullable();
        table.string('reason', 500).nullable();
        table.bigInteger('actor_id').unsigned().nullable();
        table.string('actor_type', 40).notNullable().defaultTo('SYSTEM');
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('variant_id', 'vsq_im_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('RESTRICT');
        table.foreign('location_id', 'vsq_im_location_fk')
            .references('id').inTable('vsq_inventory_locations').onDelete('RESTRICT');
        table.index(['variant_id', 'location_id', 'created_at'], 'vsq_im_stock_date_idx');
        table.index(['reference_type', 'reference_id'], 'vsq_im_reference_idx');
    });

    await knex.schema.createTable('vsq_price_lists', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('code', 80).notNullable().unique();
        table.string('name', 150).notNullable();
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        table.integer('priority').notNullable().defaultTo(0);
        table.timestamp('starts_at').nullable();
        table.timestamp('ends_at').nullable();
        timestamps(table, knex);
        table.index(['status', 'starts_at', 'ends_at'], 'vsq_pl_active_idx');
    });

    await knex.schema.createTable('vsq_variant_prices', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('price_list_id').unsigned().notNullable();
        table.bigInteger('variant_id').unsigned().notNullable();
        money(table, 'amount');
        table.decimal('compare_at_amount', 19, 4).nullable();
        table.integer('min_quantity').unsigned().notNullable().defaultTo(1);
        table.timestamp('starts_at').nullable();
        table.timestamp('ends_at').nullable();
        timestamps(table, knex);
        table.foreign('price_list_id', 'vsq_vp_list_fk')
            .references('id').inTable('vsq_price_lists').onDelete('CASCADE');
        table.foreign('variant_id', 'vsq_vp_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('CASCADE');
        table.unique(['price_list_id', 'variant_id', 'min_quantity'], 'vsq_vp_scope_uq');
        table.index(['variant_id', 'starts_at', 'ends_at'], 'vsq_vp_lookup_idx');
    });

    await knex.schema.createTable('vsq_carts', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('customer_id').unsigned().nullable();
        table.string('anonymous_token_hash', 64).nullable().unique();
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.string('channel', 40).notNullable().defaultTo('WEB');
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        money(table, 'subtotal');
        money(table, 'discount_total');
        money(table, 'tax_total');
        money(table, 'grand_total');
        table.timestamp('expires_at').nullable();
        table.integer('version').unsigned().notNullable().defaultTo(1);
        timestamps(table, knex);
        table.foreign('customer_id', 'vsq_cart_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('SET NULL');
        table.index(['customer_id', 'status', 'updated_at'], 'vsq_cart_customer_status_idx');
        table.index(['status', 'expires_at'], 'vsq_cart_expiry_idx');
    });

    await knex.schema.createTable('vsq_cart_items', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('cart_id').unsigned().notNullable();
        table.bigInteger('variant_id').unsigned().notNullable();
        table.integer('quantity').unsigned().notNullable();
        money(table, 'unit_price');
        money(table, 'line_total');
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.integer('version').unsigned().notNullable().defaultTo(1);
        timestamps(table, knex);
        table.foreign('cart_id', 'vsq_ci_cart_fk')
            .references('id').inTable('vsq_carts').onDelete('CASCADE');
        table.foreign('variant_id', 'vsq_ci_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('RESTRICT');
        table.unique(['cart_id', 'variant_id'], 'vsq_ci_cart_variant_uq');
    });

    await knex.schema.createTable('vsq_checkout_sessions', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('cart_id').unsigned().notNullable();
        table.bigInteger('customer_id').unsigned().nullable();
        table.string('status', 30).notNullable().defaultTo('OPEN');
        table.json('shipping_address_json').nullable();
        table.json('billing_address_json').nullable();
        table.bigInteger('shipping_method_id').unsigned().nullable();
        table.string('payment_method', 40).nullable();
        table.string('currency', 3).notNullable().defaultTo('INR');
        money(table, 'subtotal');
        money(table, 'discount_total');
        money(table, 'shipping_total');
        money(table, 'tax_total');
        money(table, 'grand_total');
        table.string('pricing_fingerprint', 64).nullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('completed_at').nullable();
        timestamps(table, knex);
        table.foreign('cart_id', 'vsq_co_cart_fk')
            .references('id').inTable('vsq_carts').onDelete('RESTRICT');
        table.foreign('customer_id', 'vsq_co_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('SET NULL');
        table.unique(['cart_id', 'status'], 'vsq_co_cart_status_uq');
        table.index(['status', 'expires_at'], 'vsq_co_expiry_idx');
    });

    await knex.schema.createTable('vsq_inventory_reservations', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('variant_id').unsigned().notNullable();
        table.bigInteger('location_id').unsigned().notNullable();
        table.bigInteger('cart_id').unsigned().nullable();
        table.bigInteger('checkout_session_id').unsigned().nullable();
        table.bigInteger('order_id').unsigned().nullable();
        table.integer('quantity').unsigned().notNullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        table.string('idempotency_key', 100).notNullable().unique();
        table.timestamp('expires_at').notNullable();
        timestamps(table, knex);
        table.foreign('variant_id', 'vsq_ir_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('RESTRICT');
        table.foreign('location_id', 'vsq_ir_location_fk')
            .references('id').inTable('vsq_inventory_locations').onDelete('RESTRICT');
        table.foreign('cart_id', 'vsq_ir_cart_fk')
            .references('id').inTable('vsq_carts').onDelete('SET NULL');
        table.foreign('checkout_session_id', 'vsq_ir_checkout_fk')
            .references('id').inTable('vsq_checkout_sessions').onDelete('SET NULL');
        table.index(['status', 'expires_at'], 'vsq_ir_expiry_idx');
    });

    await knex.schema.createTable('vsq_orders', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('order_number', 50).notNullable().unique();
        table.bigInteger('customer_id').unsigned().nullable();
        table.bigInteger('checkout_session_id').unsigned().notNullable().unique();
        table.string('email_snapshot', 191).notNullable();
        table.string('phone_snapshot', 30).nullable();
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.string('order_status', 40).notNullable().defaultTo('PENDING_PAYMENT');
        table.string('financial_status', 40).notNullable().defaultTo('UNPAID');
        table.string('fulfillment_status', 40).notNullable().defaultTo('UNFULFILLED');
        table.string('payment_method', 40).notNullable().defaultTo('MANUAL');
        money(table, 'subtotal');
        money(table, 'discount_total');
        money(table, 'shipping_total');
        money(table, 'tax_total');
        money(table, 'grand_total');
        table.timestamp('placed_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('paid_at').nullable();
        table.timestamp('cancelled_at').nullable();
        table.string('cancellation_reason', 500).nullable();
        table.integer('version').unsigned().notNullable().defaultTo(1);
        timestamps(table, knex);
        table.foreign('customer_id', 'vsq_o_customer_fk')
            .references('id').inTable('vsq_customers').onDelete('SET NULL');
        table.foreign('checkout_session_id', 'vsq_o_checkout_fk')
            .references('id').inTable('vsq_checkout_sessions').onDelete('RESTRICT');
        table.index(['customer_id', 'placed_at'], 'vsq_o_customer_date_idx');
        table.index(['order_status', 'placed_at'], 'vsq_o_status_date_idx');
        table.index(['financial_status'], 'vsq_o_financial_idx');
        table.index(['fulfillment_status'], 'vsq_o_fulfillment_idx');
    });

    await knex.schema.alterTable('vsq_inventory_reservations', (table) => {
        table.foreign('order_id', 'vsq_ir_order_fk')
            .references('id').inTable('vsq_orders').onDelete('SET NULL');
    });

    await knex.schema.createTable('vsq_order_items', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('order_id').unsigned().notNullable();
        table.bigInteger('variant_id').unsigned().nullable();
        table.string('sku_snapshot', 100).nullable();
        table.string('product_title_snapshot', 255).notNullable();
        table.string('variant_title_snapshot', 255).nullable();
        table.json('options_snapshot').nullable();
        table.string('image_url_snapshot', 1000).nullable();
        table.string('hsn_sac_snapshot', 20).nullable();
        table.integer('quantity').unsigned().notNullable();
        money(table, 'unit_price');
        money(table, 'discount_total');
        money(table, 'tax_total');
        money(table, 'line_total');
        table.integer('fulfilled_quantity').unsigned().notNullable().defaultTo(0);
        table.integer('refunded_quantity').unsigned().notNullable().defaultTo(0);
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_oi_order_fk')
            .references('id').inTable('vsq_orders').onDelete('CASCADE');
        table.foreign('variant_id', 'vsq_oi_variant_fk')
            .references('id').inTable('vsq_product_variants').onDelete('SET NULL');
        table.index(['order_id'], 'vsq_oi_order_idx');
        table.index(['sku_snapshot'], 'vsq_oi_sku_idx');
    });

    await knex.schema.createTable('vsq_order_addresses', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('order_id').unsigned().notNullable();
        table.string('type', 20).notNullable();
        table.json('address_json').notNullable();
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_oa_order_fk')
            .references('id').inTable('vsq_orders').onDelete('CASCADE');
        table.unique(['order_id', 'type'], 'vsq_oa_order_type_uq');
    });

    await knex.schema.createTable('vsq_order_status_history', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('order_id').unsigned().notNullable();
        table.string('status_type', 40).notNullable();
        table.string('from_status', 40).nullable();
        table.string('to_status', 40).notNullable();
        table.string('reason', 500).nullable();
        table.bigInteger('actor_id').unsigned().nullable();
        table.string('actor_type', 40).notNullable().defaultTo('SYSTEM');
        table.string('actor_snapshot', 255).nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('order_id', 'vsq_osh_order_fk')
            .references('id').inTable('vsq_orders').onDelete('CASCADE');
        table.index(['order_id', 'created_at'], 'vsq_osh_order_date_idx');
    });

    await knex.schema.createTable('vsq_payment_attempts', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('order_id').unsigned().notNullable();
        table.string('provider', 80).notNullable().defaultTo('MANUAL');
        table.string('provider_order_id', 191).nullable();
        table.string('provider_payment_id', 191).nullable();
        table.string('idempotency_key', 100).notNullable().unique();
        table.string('method', 40).notNullable().defaultTo('MANUAL');
        table.string('status', 40).notNullable().defaultTo('CREATED');
        money(table, 'amount');
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.string('failure_code', 100).nullable();
        table.string('failure_message', 500).nullable();
        table.json('provider_metadata').nullable();
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_pa_order_fk')
            .references('id').inTable('vsq_orders').onDelete('RESTRICT');
        table.unique(['provider', 'provider_payment_id'], 'vsq_pa_provider_payment_uq');
        table.index(['order_id', 'status'], 'vsq_pa_order_status_idx');
    });

    await knex.schema.createTable('vsq_payment_transactions', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('payment_attempt_id').unsigned().notNullable();
        table.string('type', 40).notNullable();
        table.string('status', 40).notNullable();
        table.string('provider_transaction_id', 191).nullable();
        money(table, 'amount');
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.timestamp('processed_at').nullable();
        table.json('provider_metadata').nullable();
        timestamps(table, knex);
        table.foreign('payment_attempt_id', 'vsq_pt_attempt_fk')
            .references('id').inTable('vsq_payment_attempts').onDelete('RESTRICT');
        table.unique(['payment_attempt_id', 'provider_transaction_id'], 'vsq_pt_provider_tx_uq');
        table.index(['payment_attempt_id', 'type'], 'vsq_pt_attempt_type_idx');
    });

    await knex.schema.createTable('vsq_shipping_zones', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('name', 150).notNullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        table.integer('priority').notNullable().defaultTo(0);
        table.json('countries_json').nullable();
        table.json('states_json').nullable();
        table.json('postcodes_json').nullable();
        table.boolean('cod_enabled').notNullable().defaultTo(false);
        timestamps(table, knex);
        table.index(['status', 'priority'], 'vsq_sz_status_priority_idx');
    });

    await knex.schema.createTable('vsq_shipping_methods', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('code', 80).notNullable().unique();
        table.string('name', 150).notNullable();
        table.string('provider', 80).notNullable().defaultTo('MANUAL');
        table.string('service_level', 80).nullable();
        table.integer('min_delivery_days').unsigned().nullable();
        table.integer('max_delivery_days').unsigned().nullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        timestamps(table, knex);
    });

    await knex.schema.createTable('vsq_order_shipping_lines', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('order_id').unsigned().notNullable();
        table.bigInteger('shipping_method_id').unsigned().nullable();
        table.string('method_code_snapshot', 80).notNullable();
        table.string('method_name_snapshot', 150).notNullable();
        table.string('provider_snapshot', 80).notNullable().defaultTo('MANUAL');
        money(table, 'amount');
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.integer('estimated_min_days').unsigned().nullable();
        table.integer('estimated_max_days').unsigned().nullable();
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_osl_order_fk')
            .references('id').inTable('vsq_orders').onDelete('CASCADE');
        table.foreign('shipping_method_id', 'vsq_osl_method_fk')
            .references('id').inTable('vsq_shipping_methods').onDelete('SET NULL');
        table.index(['order_id'], 'vsq_osl_order_idx');
    });

    await knex.schema.createTable('vsq_shipping_rates', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('zone_id').unsigned().notNullable();
        table.bigInteger('method_id').unsigned().notNullable();
        table.string('currency', 3).notNullable().defaultTo('INR');
        money(table, 'amount');
        table.decimal('free_above_amount', 19, 4).nullable();
        table.json('rule_json').nullable();
        table.string('status', 30).notNullable().defaultTo('ACTIVE');
        timestamps(table, knex);
        table.foreign('zone_id', 'vsq_sr_zone_fk')
            .references('id').inTable('vsq_shipping_zones').onDelete('CASCADE');
        table.foreign('method_id', 'vsq_sr_method_fk')
            .references('id').inTable('vsq_shipping_methods').onDelete('CASCADE');
        table.unique(['zone_id', 'method_id'], 'vsq_sr_zone_method_uq');
    });

    await knex.schema.alterTable('vsq_checkout_sessions', (table) => {
        table.foreign('shipping_method_id', 'vsq_co_ship_method_fk')
            .references('id').inTable('vsq_shipping_methods').onDelete('SET NULL');
    });

    await knex.schema.createTable('vsq_shipping_quotes', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('checkout_session_id').unsigned().notNullable();
        table.bigInteger('shipping_method_id').unsigned().notNullable();
        table.string('provider', 80).notNullable().defaultTo('MANUAL');
        table.string('provider_quote_id', 191).nullable();
        table.boolean('serviceable').notNullable().defaultTo(true);
        table.boolean('cod_available').notNullable().defaultTo(false);
        money(table, 'amount');
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.date('estimated_delivery_from').nullable();
        table.date('estimated_delivery_to').nullable();
        table.timestamp('expires_at').nullable();
        table.json('provider_metadata').nullable();
        timestamps(table, knex);
        table.foreign('checkout_session_id', 'vsq_sq_checkout_fk')
            .references('id').inTable('vsq_checkout_sessions').onDelete('CASCADE');
        table.foreign('shipping_method_id', 'vsq_sq_method_fk')
            .references('id').inTable('vsq_shipping_methods').onDelete('RESTRICT');
        table.index(['checkout_session_id', 'serviceable'], 'vsq_sq_checkout_idx');
    });

    await knex.schema.createTable('vsq_shipments', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('order_id').unsigned().notNullable();
        table.bigInteger('shipping_method_id').unsigned().nullable();
        table.string('provider', 80).notNullable().defaultTo('MANUAL');
        table.string('provider_shipment_id', 191).nullable();
        table.string('courier_name', 150).nullable();
        table.string('tracking_number', 191).nullable();
        table.string('tracking_url', 1000).nullable();
        table.string('label_url', 1000).nullable();
        table.string('status', 40).notNullable().defaultTo('PENDING');
        table.timestamp('shipped_at').nullable();
        table.timestamp('delivered_at').nullable();
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_s_order_fk')
            .references('id').inTable('vsq_orders').onDelete('RESTRICT');
        table.foreign('shipping_method_id', 'vsq_s_method_fk')
            .references('id').inTable('vsq_shipping_methods').onDelete('SET NULL');
        table.unique(['provider', 'tracking_number'], 'vsq_s_provider_tracking_uq');
        table.index(['order_id', 'status'], 'vsq_s_order_status_idx');
    });

    await knex.schema.createTable('vsq_shipment_items', (table) => {
        table.bigInteger('shipment_id').unsigned().notNullable();
        table.bigInteger('order_item_id').unsigned().notNullable();
        table.integer('quantity').unsigned().notNullable();
        table.primary(['shipment_id', 'order_item_id'], 'vsq_si_pk');
        table.foreign('shipment_id', 'vsq_si_shipment_fk')
            .references('id').inTable('vsq_shipments').onDelete('CASCADE');
        table.foreign('order_item_id', 'vsq_si_order_item_fk')
            .references('id').inTable('vsq_order_items').onDelete('RESTRICT');
    });

    await knex.schema.createTable('vsq_shipment_events', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('shipment_id').unsigned().notNullable();
        table.string('status', 40).notNullable();
        table.string('description', 500).nullable();
        table.string('location', 255).nullable();
        table.string('provider_event_id', 191).nullable();
        table.timestamp('occurred_at').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('shipment_id', 'vsq_se_shipment_fk')
            .references('id').inTable('vsq_shipments').onDelete('CASCADE');
        table.unique(['shipment_id', 'provider_event_id'], 'vsq_se_provider_event_uq');
        table.index(['shipment_id', 'occurred_at'], 'vsq_se_shipment_date_idx');
    });

    await knex.schema.createTable('vsq_discount_codes', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('code', 80).notNullable().unique();
        table.string('title', 255).notNullable();
        table.string('discount_type', 30).notNullable();
        table.decimal('value', 19, 4).notNullable();
        table.decimal('minimum_order_amount', 19, 4).nullable();
        table.decimal('maximum_discount_amount', 19, 4).nullable();
        table.integer('usage_limit').unsigned().nullable();
        table.integer('per_customer_limit').unsigned().nullable();
        table.integer('used_count').unsigned().notNullable().defaultTo(0);
        table.timestamp('starts_at').nullable();
        table.timestamp('ends_at').nullable();
        table.string('status', 30).notNullable().defaultTo('DRAFT');
        timestamps(table, knex);
        table.index(['status', 'starts_at', 'ends_at'], 'vsq_dc_active_idx');
    });

    await knex.schema.createTable('vsq_order_discounts', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('order_id').unsigned().notNullable();
        table.bigInteger('discount_code_id').unsigned().nullable();
        table.string('code_snapshot', 80).nullable();
        table.string('title_snapshot', 255).notNullable();
        money(table, 'amount');
        table.string('currency', 3).notNullable().defaultTo('INR');
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_od_order_fk').references('id').inTable('vsq_orders').onDelete('CASCADE');
        table.foreign('discount_code_id', 'vsq_od_code_fk').references('id').inTable('vsq_discount_codes').onDelete('SET NULL');
        table.index(['order_id'], 'vsq_od_order_idx');
    });

    await knex.schema.createTable('vsq_returns', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.string('return_number', 50).notNullable().unique();
        table.bigInteger('order_id').unsigned().notNullable();
        table.string('status', 40).notNullable().defaultTo('REQUESTED');
        table.string('reason_code', 80).nullable();
        table.text('customer_note').nullable();
        table.text('admin_note').nullable();
        table.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('approved_at').nullable();
        table.timestamp('received_at').nullable();
        table.timestamp('completed_at').nullable();
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_ret_order_fk').references('id').inTable('vsq_orders').onDelete('RESTRICT');
        table.index(['order_id', 'status'], 'vsq_ret_order_status_idx');
    });

    await knex.schema.createTable('vsq_return_items', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('return_id').unsigned().notNullable();
        table.bigInteger('order_item_id').unsigned().notNullable();
        table.integer('quantity').unsigned().notNullable();
        table.string('resolution', 40).nullable();
        table.string('condition', 40).nullable();
        table.decimal('approved_amount', 19, 4).nullable();
        timestamps(table, knex);
        table.foreign('return_id', 'vsq_ri_return_fk').references('id').inTable('vsq_returns').onDelete('CASCADE');
        table.foreign('order_item_id', 'vsq_ri_item_fk').references('id').inTable('vsq_order_items').onDelete('RESTRICT');
        table.unique(['return_id', 'order_item_id'], 'vsq_ri_return_item_uq');
    });

    await knex.schema.createTable('vsq_refunds', (table) => {
        table.bigIncrements('id').unsigned().primary();
        publicId(table);
        table.bigInteger('order_id').unsigned().notNullable();
        table.bigInteger('return_id').unsigned().nullable();
        table.bigInteger('payment_attempt_id').unsigned().nullable();
        table.string('provider', 80).notNullable().defaultTo('MANUAL');
        table.string('provider_refund_id', 191).nullable();
        table.string('status', 40).notNullable().defaultTo('PENDING');
        money(table, 'amount');
        table.string('currency', 3).notNullable().defaultTo('INR');
        table.string('reason', 500).nullable();
        table.timestamp('processed_at').nullable();
        table.json('provider_metadata').nullable();
        timestamps(table, knex);
        table.foreign('order_id', 'vsq_ref_order_fk').references('id').inTable('vsq_orders').onDelete('RESTRICT');
        table.foreign('return_id', 'vsq_ref_return_fk').references('id').inTable('vsq_returns').onDelete('SET NULL');
        table.foreign('payment_attempt_id', 'vsq_ref_payment_fk').references('id').inTable('vsq_payment_attempts').onDelete('SET NULL');
        table.unique(['provider', 'provider_refund_id'], 'vsq_ref_provider_uq');
        table.index(['order_id', 'status'], 'vsq_ref_order_status_idx');
    });

    await knex.schema.createTable('vsq_refund_items', (table) => {
        table.bigInteger('refund_id').unsigned().notNullable();
        table.bigInteger('order_item_id').unsigned().notNullable();
        table.integer('quantity').unsigned().notNullable();
        money(table, 'amount');
        table.primary(['refund_id', 'order_item_id'], 'vsq_rfi_pk');
        table.foreign('refund_id', 'vsq_rfi_refund_fk').references('id').inTable('vsq_refunds').onDelete('CASCADE');
        table.foreign('order_item_id', 'vsq_rfi_item_fk').references('id').inTable('vsq_order_items').onDelete('RESTRICT');
    });

    await knex.schema.createTable('vsq_provider_webhook_events', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('provider', 80).notNullable();
        table.string('provider_event_id', 191).notNullable();
        table.string('event_type', 120).notNullable();
        table.string('signature_status', 30).notNullable().defaultTo('UNVERIFIED');
        table.string('processing_status', 30).notNullable().defaultTo('PENDING');
        table.json('headers_json').nullable();
        table.json('payload_json').notNullable();
        table.integer('attempts').unsigned().notNullable().defaultTo(0);
        table.string('last_error', 1000).nullable();
        table.timestamp('processed_at').nullable();
        timestamps(table, knex);
        table.unique(['provider', 'provider_event_id'], 'vsq_pwe_provider_event_uq');
        table.index(['processing_status', 'created_at'], 'vsq_pwe_processing_idx');
    });

    await knex.schema.createTable('vsq_seo_redirects', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('from_path', 500).notNullable().unique();
        table.string('to_path', 500).notNullable();
        table.integer('http_status').unsigned().notNullable().defaultTo(301);
        table.boolean('is_active').notNullable().defaultTo(true);
        table.bigInteger('hit_count').unsigned().notNullable().defaultTo(0);
        table.timestamp('last_hit_at').nullable();
        timestamps(table, knex);
    });

    await knex.schema.createTable('vsq_commerce_audit_logs', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('actor_type', 40).notNullable();
        table.bigInteger('actor_id').unsigned().nullable();
        table.string('action', 120).notNullable();
        table.string('entity_type', 80).notNullable();
        table.string('entity_id', 100).nullable();
        table.json('before_json').nullable();
        table.json('after_json').nullable();
        table.string('ip_address', 64).nullable();
        table.string('request_id', 100).nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.index(['entity_type', 'entity_id', 'created_at'], 'vsq_cal_entity_idx');
        table.index(['actor_type', 'actor_id', 'created_at'], 'vsq_cal_actor_idx');
    });

    await knex.schema.createTable('vsq_store_settings', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('namespace', 80).notNullable();
        table.string('setting_key', 100).notNullable();
        table.json('value_json').notNullable();
        table.integer('schema_version').unsigned().notNullable().defaultTo(1);
        table.bigInteger('updated_by').unsigned().nullable();
        timestamps(table, knex);
        table.unique(['namespace', 'setting_key'], 'vsq_ss_namespace_key_uq');
    });

    await knex.schema.createTable('vsq_idempotency_keys', (table) => {
        table.string('scope', 80).notNullable();
        table.string('key_hash', 64).notNullable();
        table.string('request_hash', 64).notNullable();
        table.string('state', 30).notNullable().defaultTo('PROCESSING');
        table.string('resource_type', 80).nullable();
        table.string('resource_id', 100).nullable();
        table.integer('response_code').unsigned().nullable();
        table.json('response_json').nullable();
        table.timestamp('expires_at').notNullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.primary(['scope', 'key_hash'], 'vsq_ik_pk');
        table.index(['expires_at'], 'vsq_ik_expiry_idx');
    });

    await knex.schema.createTable('vsq_outbox_events', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('event_key', 100).notNullable().unique();
        table.string('aggregate_type', 80).notNullable();
        table.string('aggregate_id', 100).notNullable();
        table.string('event_type', 120).notNullable();
        table.integer('event_version').unsigned().notNullable().defaultTo(1);
        table.json('payload').notNullable();
        table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('published_at').nullable();
        table.integer('attempts').unsigned().notNullable().defaultTo(0);
        table.timestamp('next_attempt_at').nullable();
        table.string('last_error', 1000).nullable();
        table.index(['published_at', 'next_attempt_at'], 'vsq_oe_delivery_idx');
        table.index(['aggregate_type', 'aggregate_id'], 'vsq_oe_aggregate_idx');
    });

    await knex('vsq_price_lists').insert({
        code: 'INR_DEFAULT',
        name: 'Default INR Price List',
        currency: 'INR',
        status: 'ACTIVE',
        priority: 100
    });

    await knex('vsq_inventory_locations').insert({
        code: 'PRIMARY',
        name: 'Primary Location',
        status: 'ACTIVE',
        priority: 100
    });

    const [shippingMethodId] = await knex('vsq_shipping_methods').insert({
        code: 'STANDARD_MANUAL',
        name: 'Standard Shipping',
        provider: 'MANUAL',
        service_level: 'STANDARD',
        min_delivery_days: 3,
        max_delivery_days: 7,
        status: 'ACTIVE'
    });

    const [shippingZoneId] = await knex('vsq_shipping_zones').insert({
        name: 'India',
        status: 'ACTIVE',
        priority: 100,
        countries_json: JSON.stringify(['IN']),
        cod_enabled: true
    });

    await knex('vsq_shipping_rates').insert({
        zone_id: shippingZoneId,
        method_id: shippingMethodId,
        currency: 'INR',
        amount: 79,
        free_above_amount: 999,
        status: 'ACTIVE'
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_outbox_events');
    await knex.schema.dropTableIfExists('vsq_idempotency_keys');
    await knex.schema.dropTableIfExists('vsq_store_settings');
    await knex.schema.dropTableIfExists('vsq_commerce_audit_logs');
    await knex.schema.dropTableIfExists('vsq_seo_redirects');
    await knex.schema.dropTableIfExists('vsq_provider_webhook_events');
    await knex.schema.dropTableIfExists('vsq_refund_items');
    await knex.schema.dropTableIfExists('vsq_refunds');
    await knex.schema.dropTableIfExists('vsq_return_items');
    await knex.schema.dropTableIfExists('vsq_returns');
    await knex.schema.dropTableIfExists('vsq_order_discounts');
    await knex.schema.dropTableIfExists('vsq_discount_codes');
    await knex.schema.dropTableIfExists('vsq_shipment_events');
    await knex.schema.dropTableIfExists('vsq_shipment_items');
    await knex.schema.dropTableIfExists('vsq_shipments');
    await knex.schema.dropTableIfExists('vsq_shipping_quotes');
    await knex.schema.dropTableIfExists('vsq_order_shipping_lines');
    await knex.schema.dropTableIfExists('vsq_payment_transactions');
    await knex.schema.dropTableIfExists('vsq_payment_attempts');
    await knex.schema.dropTableIfExists('vsq_order_status_history');
    await knex.schema.dropTableIfExists('vsq_order_addresses');
    await knex.schema.dropTableIfExists('vsq_order_items');
    await knex.schema.dropTableIfExists('vsq_inventory_reservations');
    await knex.schema.dropTableIfExists('vsq_orders');
    await knex.schema.dropTableIfExists('vsq_checkout_sessions');
    await knex.schema.dropTableIfExists('vsq_shipping_rates');
    await knex.schema.dropTableIfExists('vsq_shipping_methods');
    await knex.schema.dropTableIfExists('vsq_shipping_zones');
    await knex.schema.dropTableIfExists('vsq_cart_items');
    await knex.schema.dropTableIfExists('vsq_carts');
    await knex.schema.dropTableIfExists('vsq_variant_prices');
    await knex.schema.dropTableIfExists('vsq_price_lists');
    await knex.schema.dropTableIfExists('vsq_inventory_movements');
    await knex.schema.dropTableIfExists('vsq_inventory_levels');
    await knex.schema.dropTableIfExists('vsq_inventory_locations');
    await knex.schema.dropTableIfExists('vsq_collection_products');
    await knex.schema.dropTableIfExists('vsq_collections');
    await knex.schema.dropTableIfExists('vsq_product_categories');
    await knex.schema.dropTableIfExists('vsq_categories');
    await knex.schema.dropTableIfExists('vsq_product_metafields');
    await knex.schema.dropTableIfExists('vsq_variant_media');
    await knex.schema.dropTableIfExists('vsq_product_media');
    await knex.schema.dropTableIfExists('vsq_media_assets');
    await knex.schema.dropTableIfExists('vsq_variant_option_values');
    await knex.schema.dropTableIfExists('vsq_wishlist_items');
    await knex.schema.dropTableIfExists('vsq_product_variants');
    await knex.schema.dropTableIfExists('vsq_product_option_values');
    await knex.schema.dropTableIfExists('vsq_product_options');
    await knex.schema.dropTableIfExists('vsq_products');
    await knex.schema.dropTableIfExists('vsq_wishlists');
    await knex.schema.dropTableIfExists('vsq_customer_addresses');
    await knex.schema.dropTableIfExists('vsq_customer_sessions');
    await knex.schema.dropTableIfExists('vsq_customer_credentials');
    await knex.schema.dropTableIfExists('vsq_customers');
    await knex.schema.dropTableIfExists('vsq_tax_categories');
}
