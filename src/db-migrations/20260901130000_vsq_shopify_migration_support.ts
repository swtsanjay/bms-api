import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    if (!await knex.schema.hasColumn('vsq_products', 'legacy_shopify_product_id')) {
        await knex.schema.alterTable('vsq_products', (table) => {
            table.string('legacy_shopify_product_id', 100).nullable();
            table.string('source_status', 30).nullable();
            table.timestamp('source_created_at').nullable();
            table.timestamp('source_updated_at').nullable();
            table.unique(['legacy_shopify_product_id'], 'vsq_p_shopify_id_uq');
        });
    }

    if (!await knex.schema.hasColumn('vsq_product_variants', 'legacy_shopify_variant_id')) {
        await knex.schema.alterTable('vsq_product_variants', (table) => {
            table.string('legacy_shopify_variant_id', 100).nullable();
            table.unique(['legacy_shopify_variant_id'], 'vsq_pv_shopify_id_uq');
        });
    }

    // A Shopify media GID is stable and gives reruns a lossless upsert key.
    await knex.schema.alterTable('vsq_media_assets', (table) => {
        table.dropIndex(['source_system', 'source_id'], 'vsq_ma_source_idx');
        table.unique(['source_system', 'source_id'], 'vsq_ma_source_uq');
    });

    await knex.schema.createTable('vsq_migration_runs', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.string('source_system', 40).notNullable();
        table.string('source_shop', 191).notNullable();
        table.string('api_version', 20).notNullable();
        table.string('status', 30).notNullable().defaultTo('RUNNING');
        table.boolean('dry_run').notNullable().defaultTo(false);
        table.json('counts_json').nullable();
        table.json('report_json').nullable();
        table.text('error_message').nullable();
        table.timestamp('started_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('completed_at').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.index(['source_system', 'source_shop', 'started_at'], 'vsq_mr_source_started_idx');
        table.index(['status', 'started_at'], 'vsq_mr_status_started_idx');
    });

    await knex.schema.createTable('vsq_migration_entities', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.bigInteger('run_id').unsigned().notNullable();
        table.string('entity_type', 40).notNullable();
        table.string('source_id', 191).notNullable();
        table.string('destination_id', 100).nullable();
        table.string('source_checksum', 64).nullable();
        table.string('status', 30).notNullable().defaultTo('IMPORTED');
        table.text('error_message').nullable();
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('run_id', 'vsq_me_run_fk')
            .references('id').inTable('vsq_migration_runs').onDelete('CASCADE');
        table.unique(['run_id', 'entity_type', 'source_id'], 'vsq_me_run_entity_source_uq');
        table.index(['entity_type', 'source_id'], 'vsq_me_entity_source_idx');
        table.index(['status', 'updated_at'], 'vsq_me_status_updated_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_migration_entities');
    await knex.schema.dropTableIfExists('vsq_migration_runs');

    if (await knex.schema.hasTable('vsq_media_assets')) {
        await knex.schema.alterTable('vsq_media_assets', (table) => {
            table.dropUnique(['source_system', 'source_id'], 'vsq_ma_source_uq');
            table.index(['source_system', 'source_id'], 'vsq_ma_source_idx');
        });
    }

    if (await knex.schema.hasColumn('vsq_product_variants', 'legacy_shopify_variant_id')) {
        await knex.schema.alterTable('vsq_product_variants', (table) => {
            table.dropUnique(['legacy_shopify_variant_id'], 'vsq_pv_shopify_id_uq');
            table.dropColumn('legacy_shopify_variant_id');
        });
    }

    if (await knex.schema.hasColumn('vsq_products', 'legacy_shopify_product_id')) {
        await knex.schema.alterTable('vsq_products', (table) => {
            table.dropUnique(['legacy_shopify_product_id'], 'vsq_p_shopify_id_uq');
            table.dropColumn('legacy_shopify_product_id');
            table.dropColumn('source_status');
            table.dropColumn('source_created_at');
            table.dropColumn('source_updated_at');
        });
    }
}
