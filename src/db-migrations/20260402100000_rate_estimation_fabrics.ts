import type { Knex } from 'knex';

const USER_TYPES = [
    'EMPLOYEE',
    'VENDOR',
    'SUPER_ADMIN',
    'SUB_ADMIN',
    'USER',
    'COMPANY',
    'GUEST',
    'FABRIC_SUPPLIER'
] as const;

async function ensureFabricSupplierUserType(knex: Knex) {
    await knex.raw(`
        ALTER TABLE users
        MODIFY COLUMN user_type ENUM('${USER_TYPES.join("','")}')
        NOT NULL DEFAULT 'EMPLOYEE'
    `);
}

async function ensureRateEstimationFabricsTable(knex: Knex) {
    const hasTable = await knex.schema.hasTable('fabrics');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('fabrics', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('seller_user_id').unsigned().notNullable()
            .references('id').inTable('users')
            .onDelete('RESTRICT').onUpdate('CASCADE');
        table.string('fabric_name', 150).notNullable();
        table.string('fabric_type', 100).notNullable();
        table.decimal('price', 12, 2).notNullable().defaultTo(0);
        table.string('unit', 30).notNullable().defaultTo('METER');
        table.decimal('pieces_per_unit', 10, 2).notNullable().defaultTo(0);
        table.text('description').nullable();
        table.boolean('is_active').notNullable().defaultTo(true);
        table.timestamps(true, true);

        table.index(['seller_user_id'], 'fabrics_seller_user_id_idx');
        table.index(['fabric_type'], 'fabrics_fabric_type_idx');
        table.index(['is_active'], 'fabrics_is_active_idx');
    });
}

async function ensureRateEstimationFabricStylesTable(knex: Knex) {
    const hasTable = await knex.schema.hasTable('fabric_styles');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('fabric_styles', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('fabric_id').unsigned().notNullable()
            .references('id').inTable('fabrics')
            .onDelete('CASCADE').onUpdate('CASCADE');
        table.string('style_name', 120).notNullable();
        table.decimal('pieces_per_unit', 10, 2).nullable();
        table.timestamps(true, true);

        table.index(['fabric_id'], 'fabric_styles_fabric_id_idx');
        table.unique(['fabric_id', 'style_name'], 'fabric_styles_unique_idx');
    });
}

async function ensureRateEstimationFabricImagesTable(knex: Knex) {
    const hasTable = await knex.schema.hasTable('fabric_images');
    if (hasTable) {
        return;
    }

    await knex.schema.createTable('fabric_images', function (table) {
        table.increments('id').unsigned().primary();
        table.integer('fabric_id').unsigned().notNullable()
            .references('id').inTable('fabrics')
            .onDelete('CASCADE').onUpdate('CASCADE');
        table.string('image_url', 255).notNullable();
        table.boolean('is_primary').notNullable().defaultTo(false);
        table.integer('sort_order').notNullable().defaultTo(1);
        table.timestamps(true, true);

        table.index(['fabric_id'], 'fabric_images_fabric_id_idx');
    });
}

export async function up(knex: Knex): Promise<void> {
    await ensureFabricSupplierUserType(knex);
    await ensureRateEstimationFabricsTable(knex);
    await ensureRateEstimationFabricStylesTable(knex);
    await ensureRateEstimationFabricImagesTable(knex);
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('fabric_images')) {
        await knex.schema.dropTable('fabric_images');
    }

    if (await knex.schema.hasTable('fabric_styles')) {
        await knex.schema.dropTable('fabric_styles');
    }

    if (await knex.schema.hasTable('fabrics')) {
        await knex.schema.dropTable('fabrics');
    }

    await knex.raw(`
        ALTER TABLE users
        MODIFY COLUMN user_type ENUM('EMPLOYEE','VENDOR','SUPER_ADMIN','SUB_ADMIN','USER','COMPANY','GUEST')
        NOT NULL DEFAULT 'EMPLOYEE'
    `);
}
