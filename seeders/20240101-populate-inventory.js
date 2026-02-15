'use strict';

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const csvPath = path.resolve(__dirname, '../ML/AgricultureData.csv');
        console.log(`Reading CSV from: ${csvPath}`);

        return new Promise((resolve, reject) => {
            const items = [];
            const baseProducts = new Set();
            const productAttributes = {
                'Milk': ['Whole', 'Skim', '2%', 'Low Fat', 'Organic', 'Lactose-Free', 'Chocolate', 'Strawberry', 'Vanilla', 'Premium', 'Farm Fresh', 'Raw', 'Pasteurized', 'Homogenized', 'Full Cream', 'Calcium Enriched', 'Vitamin D', 'Goat', 'Almond', 'Soy', 'Oat', 'Coconut', 'Cashew', 'Rice', 'Hemp', 'Flavored', 'Double Toned', 'Toned', 'Condensed', 'Evaporated', 'Powdered', 'UHT', 'A2', 'Grass-Fed', 'Jersey', 'Guernsey'],
                'Cheese': ['Cheddar', 'Mozzarella', 'Parmesan', 'Swiss', 'Gouda', 'Brie', 'Camembert', 'Feta', 'Blue', 'Monterey Jack', 'Provolone', 'Ricotta', 'Cottage', 'Cream', 'Goat', 'Sheep', 'Vegan', 'Smoked', 'Aged', 'Sharp', 'Mild', 'Pepper Jack', 'Havarti', 'Gruyere', 'Romano', 'Asiago', 'Gorgonzola', 'Limburger', 'Mascarpone', 'Muenster', 'Neufchatel', 'Paneer', 'Processing', 'Roquefort', 'Stilton'],
                'Butter': ['Salted', 'Unsalted', 'Clarified', 'Ghee', 'Cultured', 'European Style', 'Whipped', 'Spread', 'Organic', 'Grass-Fed', 'Garlic Herb', 'Honey', 'Truffle', 'Light', 'Stick', 'Tub', 'Block', 'Roll', 'Homemade', 'Farmhouse'],
                'Yogurt': ['Greek', 'Regular', 'Low Fat', 'Non-Fat', 'Plain', 'Vanilla', 'Strawberry', 'Blueberry', 'Raspberry', 'Peach', 'Mango', 'Honey', 'Organic', 'Probiotic', 'Drinkable', 'Frozen', 'Coconut', 'Almond', 'Soy', 'Cashew'],
                'Beef': ['Ground', 'Steak', 'Roast', 'Ribs', 'Sirloin', 'Tenderloin', 'Brisket', 'Chunk', 'Stew', 'Patty', 'Jerky', 'Corned', 'Angus', 'Wagyu', 'Kobe', 'Grass-Fed', 'Organic', 'Lean', 'Extra Lean', 'Prime', 'Choice', 'Select'],
                'Chicken': ['Breast', 'Thigh', 'Wing', 'Leg', 'Drumstick', 'Whole', 'Quarter', 'Tenders', 'Ground', 'Sausage', 'Nuggets', 'Liver', 'Organic', 'Free-Range', 'Pasture-Raised', 'Antibiotic-Free', 'Skinless', 'Boneless', 'Bone-In', 'Marinated'],
                'Pork': ['Chops', 'Roast', 'Ribs', 'Loin', 'Bacon', 'Ham', 'Sausage', 'Ground', 'Belly', 'Shoulder', 'Tenderloin', 'Organic', 'Heritage Breed', 'Smoked', 'Cured', 'Fresh'],
                'Lamb': ['Chops', 'Leg', 'Rack', 'Shank', 'Shoulder', 'Ground', 'Stew', 'Roast', 'Organic', 'Grass-Fed', 'Spring', 'New Zealand', 'Australian'],
                'Apples': ['Red Delicious', 'Golden Delicious', 'Granny Smith', 'Fuji', 'Gala', 'Honeycrisp', 'Pink Lady', 'Braeburn', 'Jonagold', 'McIntosh', 'Ambrosia', 'Empire', 'Cortland', 'Organic', 'Green', 'Red', 'Yellow'],
                'Bananas': ['Cavendish', 'Lady Finger', 'Plantain', 'Red', 'Organic', 'Fair Trade', 'Ripe', 'Green', 'Bunch'],
                'Oranges': ['Navel', 'Valencia', 'Blood', 'Mandarin', 'Clementine', 'Tangerine', 'Organic', 'Juicing', 'Seedless'],
                'Grapes': ['Red Seedless', 'Green Seedless', 'Black Seedless', 'Concord', 'Cotton Candy', 'Organic', 'Table', 'Wine'],
                'Strawberries': ['Organic', 'Wild', 'Large', 'Sweet', 'Fresh Picked', 'Garden', 'Greenhouse'],
                'Blueberries': ['Organic', 'Wild', 'Large', 'Sweet', 'Fresh Picked', 'Highbush', 'Lowbush'],
                'Peaches': ['Yellow', 'White', 'Donut', 'Nectarine', 'Organic', 'Clingstone', 'Freestone'],
                'Tomatoes': ['Roma', 'Beefsteak', 'Cherry', 'Grape', 'Heirloom', 'On Vine', 'Organic', 'Green', 'Sun-Dried', 'Plum'],
                'Potatoes': ['Russet', 'Yukon Gold', 'Red', 'Fingerling', 'Sweet', 'Purple', 'Organic', 'Baby', 'Baking'],
                'Onions': ['Yellow', 'Red', 'White', 'Sweet', 'Vidalia', 'Shallots', 'Green', 'Organic', 'Pearl'],
                'Lettuce': ['Iceberg', 'Romaine', 'Butterhead', 'Leaf', 'Arugula', 'Spinach', 'Kale', 'Organic', 'Hydroponic'],
                'Peppers': ['Bell Red', 'Bell Green', 'Bell Yellow', 'Bell Orange', 'Jalapeno', 'Habanero', 'Serrano', 'Organic', 'Sweet', 'Hot'],
                'Carrots': ['Orange', 'Purple', 'White', 'Baby', 'Organic', 'Bunch', 'Loose'],
                'Cabbage': ['Green', 'Red', 'Savoy', 'Napa', 'Bok Choy', 'Organic'],
                'Corn': ['Sweet Yellow', 'Sweet White', 'Bi-Color', 'Organic', 'Cob', 'Kernel'],
                'Rice': ['Basmati', 'Jasmine', 'Brown', 'White', 'Arborio', 'Wild', 'Organic', 'Long Grain', 'Short Grain'],
                'Wheat': ['Whole', 'White', 'Flour', 'Bulgur', 'Organic', 'Hard Red', 'Soft White'],
                'Oats': ['Rolled', 'Steel Cut', 'Instant', 'Organic', 'Quick', 'Old Fashioned'],
                'Barley': ['Pearl', 'Hulled', 'Flakes', 'Organic'],
                'Rye': ['Whole', 'Flour', 'Organic', 'Dark', 'Light']
            };

            const genericAdjectives = ['Premium', 'Organic', 'Fresh', 'Natural', 'local', 'Quality', 'Best Value', 'Farm Choice', 'Select', 'Classic', 'Original', 'Artisanal', 'Handcrafted', 'Sustainable', 'Eco-Friendly'];

            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    if (items.length >= 1000) return;

                    let category = '';
                    const rawCategory = row.category || '';
                    if (['Dairy'].includes(rawCategory)) category = 'Dairy Product';
                    else category = 'Organic Vegetable';

                    if (category) {
                        const baseName = row.product_name;
                        let uniqueName = baseName;

                        // Try to generate unique names
                        let attempts = 0;
                        while (attempts < 50) {
                            let variant = '';
                            if (productAttributes[baseName]) {
                                const attrs = productAttributes[baseName];
                                variant = attrs[Math.floor(Math.random() * attrs.length)];
                            }

                            // Combine: Variant + Base Name (e.g. "Whole Milk")
                            // Or Base Name + Variant (e.g. "Apples Fuji") - depends on type
                            // Let's mix it up

                            if (Math.random() > 0.5 && variant) {
                                uniqueName = `${variant} ${baseName}`;
                            } else if (variant) {
                                uniqueName = `${baseName} ${variant}`;
                            } else {
                                // Fallback to generic adjectives
                                const adj = genericAdjectives[Math.floor(Math.random() * genericAdjectives.length)];
                                uniqueName = `${adj} ${baseName}`;
                            }

                            // Check if unique
                            const key = uniqueName.toLowerCase();
                            if (!baseProducts.has(key)) {
                                baseProducts.add(key);
                                break;
                            }
                            // If duplicate, try adding another random adjective
                            const extra = genericAdjectives[Math.floor(Math.random() * genericAdjectives.length)];
                            uniqueName = `${extra} ${uniqueName}`;
                            attempts++;
                        }

                        const price = parseFloat(row.price_per_kg) || 0;
                        const quantity = parseFloat(row.units_on_hand_kg) || 0;

                        if (quantity > 0) {
                            items.push({
                                item_name: uniqueName,
                                category: category,
                                unit_price: price,
                                quantity: quantity,
                                unit: 'kg',
                                threshold: 50,
                                expiry_date: category === 'Dairy Product' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                        }
                    }
                })
                .on('end', async () => {
                    console.log(`Generated ${items.length} distinct item names.`);

                    if (items.length > 0) {
                        try {
                            // Disable FK checks to allow clearing inventory even if referenced
                            await queryInterface.sequelize.query('PRAGMA foreign_keys = OFF;');
                            await queryInterface.bulkDelete('Inventories', null, {});
                            await queryInterface.sequelize.query('PRAGMA foreign_keys = ON;');

                            // Batch insert
                            const chunkSize = 500;
                            for (let i = 0; i < items.length; i += chunkSize) {
                                const chunk = items.slice(i, i + chunkSize);
                                await queryInterface.bulkInsert('Inventories', chunk, {});
                                console.log(`Inserted batch ${i} to ${i + chunk.length}`);
                            }
                            console.log('Bulk seed successful.');
                            resolve();
                        } catch (error) {
                            console.error('Error inserting items:', error);
                            reject(error);
                        }
                    } else {
                        console.log('No items found to seed.');
                        resolve();
                    }
                })
                .on('error', (err) => {
                    console.error('Error reading CSV:', err);
                    reject(err);
                });
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Ideally we would delete only seeded items, but for now we might leave them or delete all
        // safe choice: do nothing or delete specific categories
        return queryInterface.bulkDelete('Inventories', {
            category: ['Dairy Product', 'Organic Vegetable']
        }, {});
    }
};
