/**
 * @param purchase запись о покупке
 * @returns {number}
 */
function calculateSimpleRevenue(purchase) {
    const discountFactor = 1 - purchase.discount / 100;
    return purchase.sale_price * purchase.quantity * discountFactor;
}

/**
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15;
    }
    if (index === 1 || index === 2) {
        return seller.profit * 0.10;
    }
    if (index === total - 1) {
        return 0;
    }
    return seller.profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data) {
        throw new Error('Нет данных');
    }

    const {sellers, products, purchase_records} = data;

    if (!Array.isArray(sellers) || sellers.length === 0) {
        throw new Error('Нет sellers');
    }
    if (!Array.isArray(products) || products.length === 0) {
        throw new Error('Нет products');
    }
    if (!Array.isArray(purchase_records) || purchase_records.length === 0) {
        throw new Error('Нет purchase_records');
    }

    if (!options || !options.calculateRevenue || !options.calculateBonus) {
        throw new Error('Нет опций');
    }

    const sellersMap = {};
    sellers.forEach(s => {
        sellersMap[s.id] = {
            seller_id: s.id,
            name: `${s.first_name} ${s.last_name}`,
            revenue: 0,
            profit: 0,
            sales_count: 0,
            products_sold: {}
        };
    });

    const productsMap = {};
    products.forEach(p => {
        productsMap[p.sku] = p;
    });

    purchase_records.forEach(record => {
        const seller = sellersMap[record.seller_id];

        seller.sales_count += 1;

        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productsMap[item.sku];

            const revenue = options.calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;

            seller.profit += revenue - cost;

            seller.products_sold[item.sku] =
                (seller.products_sold[item.sku] || 0) + item.quantity;
        });
    });

    const result = Object.values(sellersMap)
        .sort((a, b) => b.profit - a.profit);

    result.forEach((seller, index) => {
        seller.bonus = options.calculateBonus(
            index,
            result.length,
            seller
        );

        seller.top_products = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({sku, quantity}));

        delete seller.products_sold;

        seller.revenue = +seller.revenue.toFixed(2);
        seller.profit = +seller.profit.toFixed(2);
        seller.bonus = +seller.bonus.toFixed(2);
    });

    return result;
}
