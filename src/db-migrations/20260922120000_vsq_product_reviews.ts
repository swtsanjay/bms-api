import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('vsq_product_reviews', (table) => {
        table.bigIncrements('id').unsigned().primary();
        table.string('public_id', 36).notNullable().unique();
        table.bigInteger('product_id').unsigned().notNullable();
        table.bigInteger('customer_id').unsigned().notNullable();
        table.bigInteger('order_item_id').unsigned().nullable();
        table.string('reviewer_name', 120).notNullable();
        table.specificType('rating', 'tinyint unsigned').notNullable();
        table.check('?? BETWEEN 1 AND 5', ['rating'], 'vsq_review_rating_check');
        table.string('title', 120).notNullable().defaultTo('');
        table.text('body').notNullable();
        table.boolean('verified_purchase').notNullable().defaultTo(false);
        table.enu('status', ['PENDING', 'PUBLISHED', 'REJECTED']).notNullable().defaultTo('PENDING');
        table.string('moderation_note', 500).nullable();
        table.bigInteger('moderated_by').unsigned().nullable();
        table.timestamp('moderated_at').nullable();
        table.timestamp('published_at').nullable();
        table.integer('version').unsigned().notNullable().defaultTo(1);
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.foreign('product_id', 'vsq_review_product_fk').references('id').inTable('vsq_products').onDelete('CASCADE');
        table.foreign('customer_id', 'vsq_review_customer_fk').references('id').inTable('vsq_customers').onDelete('CASCADE');
        table.foreign('order_item_id', 'vsq_review_order_item_fk').references('id').inTable('vsq_order_items').onDelete('SET NULL');
        table.unique(['product_id', 'customer_id'], 'vsq_review_product_customer_uq');
        table.index(['product_id', 'status', 'created_at'], 'vsq_review_product_public_idx');
        table.index(['status', 'created_at'], 'vsq_review_moderation_idx');
        table.index(['customer_id', 'created_at'], 'vsq_review_customer_date_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('vsq_product_reviews');
}
