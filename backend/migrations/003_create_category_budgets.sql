-- +up
CREATE TABLE IF NOT EXISTS category_budgets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT category_budgets_unique_month UNIQUE (user_id, category_id, month)
);

-- +down
DROP TABLE IF EXISTS category_budgets;

