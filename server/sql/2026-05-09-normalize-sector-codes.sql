UPDATE sectors
SET code = LPAD(substring(code from '^\d{1,2}'), 2, '0') || '.00.00',
    updated_at = CURRENT_TIMESTAMP
WHERE code ~ '^\d{1,2}(\.|$)'
  AND code !~ '^\d{2}\.00\.00$';
