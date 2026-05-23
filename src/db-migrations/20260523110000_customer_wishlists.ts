import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable("wishlists");
    if (!hasTable) {
        return;
    }

    const hasCustomerId = await knex.schema.hasColumn("wishlists", "customer_id");
    if (!hasCustomerId) {
        await knex.schema.alterTable("wishlists", function (table) {
            table.integer("customer_id").unsigned().nullable().after("user_id");
        });
    }

    await knex.schema.alterTable("wishlists", function (table) {
        table.dropForeign(["user_id"], "wishlists_user_id_fk");
    }).catch(() => null);

    await knex.schema.alterTable("wishlists", function (table) {
        table.integer("user_id").unsigned().nullable().alter();
        table.index(["customer_id"], "wishlists_customer_id_idx");
        table.unique(["customer_id", "shopify_product_id"], {
            indexName: "wishlists_customer_product_unique"
        });
        table
            .foreign("customer_id", "wishlists_customer_id_fk")
            .references("id")
            .inTable("customers")
            .onDelete("CASCADE");
    });
}

export async function down(knex: Knex): Promise<void> {
    const hasTable = await knex.schema.hasTable("wishlists");
    if (!hasTable) {
        return;
    }

    const hasCustomerId = await knex.schema.hasColumn("wishlists", "customer_id");
    if (!hasCustomerId) {
        return;
    }

    await knex.schema.alterTable("wishlists", function (table) {
        table.dropForeign(["customer_id"], "wishlists_customer_id_fk");
        table.dropUnique(["customer_id", "shopify_product_id"], "wishlists_customer_product_unique");
        table.dropIndex(["customer_id"], "wishlists_customer_id_idx");
        table.dropColumn("customer_id");
    });
}
