import type { Knex } from 'knex';

const ORDER_STATUSES = [
    'CREATED',
    'FABRIC_PURCHASING',
    'PATTERN_MAKING',
    'CUTTING',
    'STITCHING',
    'KAJ_BUTTON',
    'DHAGA_CUTTING',
    'PRESSING',
    'PACKING'
] as const;

const PAYMENT_STATUSES = ['RECEIVED', 'NOT_RECEIVED'] as const;

async function createProductTables(knex: Knex) {
    const hasProducts = await knex.schema.hasTable('products');
    if (!hasProducts) {
        await knex.schema.createTable('products', function (table) {
            table.increments('id').unsigned().primary();
            table.string('name', 150).notNullable();
            table.decimal('price', 10, 2).notNullable().defaultTo(0);
            table.timestamps(true, true);
            table.index(['name'], 'products_name_idx');
        });
    }

    const hasProductSizes = await knex.schema.hasTable('product_sizes');
    if (!hasProductSizes) {
        await knex.schema.createTable('product_sizes', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('product_id').unsigned().notNullable()
                .references('id').inTable('products')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('size', 50).notNullable();
            table.timestamps(true, true);
            table.index(['product_id'], 'product_sizes_product_id_idx');
        });
    }

    const hasProductImages = await knex.schema.hasTable('product_images');
    if (!hasProductImages) {
        await knex.schema.createTable('product_images', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('product_id').unsigned().notNullable()
                .references('id').inTable('products')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('url', 255).notNullable();
            table.timestamps(true, true);
            table.index(['product_id'], 'product_images_product_id_idx');
        });
    }

    const hasProductColors = await knex.schema.hasTable('product_colors');
    if (!hasProductColors) {
        await knex.schema.createTable('product_colors', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('product_id').unsigned().notNullable()
                .references('id').inTable('products')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.string('color', 100).notNullable();
            table.timestamps(true, true);
            table.index(['product_id'], 'product_colors_product_id_idx');
        });
    }
}

async function ensureOrdersTable(knex: Knex) {
    const hasOrders = await knex.schema.hasTable('orders');
    if (!hasOrders) {
        await knex.schema.createTable('orders', function (table) {
            table.increments('id').unsigned().primary();
            table.enu('status', [...ORDER_STATUSES]).notNullable().defaultTo('CREATED');
            table.enu('payment_status', [...PAYMENT_STATUSES]).notNullable().defaultTo('NOT_RECEIVED');
            table.integer('client_id').unsigned().notNullable()
                .references('id').inTable('users')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.integer('created_by').unsigned().notNullable()
                .references('id').inTable('users')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.timestamps(true, true);
            table.index(['client_id'], 'orders_client_id_idx');
            table.index(['created_by'], 'orders_created_by_idx');
            table.index(['status'], 'orders_status_idx');
        });
        return;
    }

    const hasClientId = await knex.schema.hasColumn('orders', 'client_id');
    const hasUserId = await knex.schema.hasColumn('orders', 'user_id');
    if (!hasClientId) {
        await knex.schema.alterTable('orders', function (table) {
            table.integer('client_id').unsigned().nullable();
        });
    }

    if (hasUserId) {
        await knex('orders').whereNull('client_id').update({ client_id: knex.ref('user_id') });
    }

    const hasStatus = await knex.schema.hasColumn('orders', 'status');
    if (!hasStatus) {
        await knex.schema.alterTable('orders', function (table) {
            table.enu('status', [...ORDER_STATUSES]).notNullable().defaultTo('CREATED');
        });
    }

    const hasPaymentStatus = await knex.schema.hasColumn('orders', 'payment_status');
    if (!hasPaymentStatus) {
        await knex.schema.alterTable('orders', function (table) {
            table.enu('payment_status', [...PAYMENT_STATUSES]).notNullable().defaultTo('NOT_RECEIVED');
        });
    }

    const hasCreatedBy = await knex.schema.hasColumn('orders', 'created_by');
    if (!hasCreatedBy) {
        await knex.schema.alterTable('orders', function (table) {
            table.integer('created_by').unsigned().nullable();
        });
    }
}

async function ensureOrderItemsTable(knex: Knex) {
    const hasOrderItems = await knex.schema.hasTable('order_items');
    if (!hasOrderItems) {
        await knex.schema.createTable('order_items', function (table) {
            table.increments('id').unsigned().primary();
            table.integer('order_id').unsigned().notNullable()
                .references('id').inTable('orders')
                .onDelete('CASCADE').onUpdate('CASCADE');
            table.integer('product_id').unsigned().notNullable()
                .references('id').inTable('products')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.integer('product_sizes_id').unsigned().notNullable()
                .references('id').inTable('product_sizes')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.integer('product_colors_id').unsigned().nullable()
                .references('id').inTable('product_colors')
                .onDelete('SET NULL').onUpdate('CASCADE');
            table.integer('product_images_id').unsigned().nullable()
                .references('id').inTable('product_images')
                .onDelete('SET NULL').onUpdate('CASCADE');
            table.integer('quantity').notNullable().defaultTo(1);
            table.decimal('price', 10, 2).notNullable().defaultTo(0);
            table.enu('status', [...ORDER_STATUSES]).notNullable().defaultTo('CREATED');
            table.enu('payment_status', [...PAYMENT_STATUSES]).notNullable().defaultTo('NOT_RECEIVED');
            table.integer('created_by').unsigned().notNullable()
                .references('id').inTable('users')
                .onDelete('RESTRICT').onUpdate('CASCADE');
            table.timestamps(true, true);
            table.index(['order_id'], 'order_items_order_id_idx');
            table.index(['product_id'], 'order_items_product_id_idx');
        });
        return;
    }

    const hasPrice = await knex.schema.hasColumn('order_items', 'price');
    const hasPpPrice = await knex.schema.hasColumn('order_items', 'pp_price');
    if (!hasPrice && hasPpPrice) {
        await knex.schema.alterTable('order_items', function (table) {
            table.renameColumn('pp_price', 'price');
        });
    }

    const columnChecks: Array<{ name: string; create: (table: Knex.AlterTableBuilder) => void }> = [
        { name: 'product_id', create: (table) => table.integer('product_id').unsigned().nullable() },
        { name: 'product_sizes_id', create: (table) => table.integer('product_sizes_id').unsigned().nullable() },
        { name: 'product_colors_id', create: (table) => table.integer('product_colors_id').unsigned().nullable() },
        { name: 'product_images_id', create: (table) => table.integer('product_images_id').unsigned().nullable() },
        { name: 'status', create: (table) => table.enu('status', [...ORDER_STATUSES]).notNullable().defaultTo('CREATED') },
        { name: 'payment_status', create: (table) => table.enu('payment_status', [...PAYMENT_STATUSES]).notNullable().defaultTo('NOT_RECEIVED') },
        { name: 'created_by', create: (table) => table.integer('created_by').unsigned().nullable() },
    ];

    for (const column of columnChecks) {
        const hasColumn = await knex.schema.hasColumn('order_items', column.name);
        if (!hasColumn) {
            await knex.schema.alterTable('order_items', function (table) {
                column.create(table);
            });
        }
    }
}

export async function up(knex: Knex): Promise<void> {
    await createProductTables(knex);
    await ensureOrdersTable(knex);
    await ensureOrderItemsTable(knex);
}

export async function down(knex: Knex): Promise<void> {
    if (await knex.schema.hasTable('product_colors')) {
        await knex.schema.dropTable('product_colors');
    }
    if (await knex.schema.hasTable('product_images')) {
        await knex.schema.dropTable('product_images');
    }
    if (await knex.schema.hasTable('product_sizes')) {
        await knex.schema.dropTable('product_sizes');
    }
    if (await knex.schema.hasTable('products')) {
        await knex.schema.dropTable('products');
    }
}
