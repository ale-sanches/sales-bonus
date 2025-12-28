/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - purchase.discount / 100;
    const revenue = purchase.sale_price * purchase.quantity * discountFactor;
    return revenue
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return 15; // первый — 15%
    } else if (index === 1 || index === 2) {
        return 10; // второй и третий — 10%
    } else if (index === total - 1) {
        return 0; // последний — 0%
    } else {
        return 5; // все остальные — 5%
    }

}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    if (!options) {
        throw new Error('Нет опций');
    }
    const {calculateRevenue, calculateBonus} = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Чего-то не хватает');
    }
    //Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    //Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map(seller => [seller.id, seller]))
    const productIndex = Object.fromEntries(data.products.map(product => [product.sku, product]));

    // Обработка всех чеков
    data.purchase_records.forEach(record => { // Чек
        const seller = sellerIndex[record.seller_id]; // Продавец
        let totalRevenue = 0;

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku]; // Товар
            const revenue = calculateRevenue(item, product);
            totalRevenue += revenue;

            const cost = product.purchase_price * item.quantity
            seller.profit += revenue - cost;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
            // По артикулу товара увеличить его проданное количество у продавца
        });
        seller.revenue += totalRevenue; // добавляем суммарную выручку по чеку
        seller.sales_count += 1;
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);
    const totalSellers = sellerStats.length

    //  Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({sku, quantity}));
    });
    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: Object.entries(seller.products_sold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({sku, quantity})),
        bonus: +seller.bonus.toFixed(2)
    }));
}