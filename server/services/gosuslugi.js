const getEnv = (key, fallback) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const getGosuslugiProfile = async () => ({
  provider: 'mock',
  name: getEnv('GOSUSLUGI_MOCK_NAME', 'Иванов Иван Иванович'),
  phone: getEnv('GOSUSLUGI_MOCK_PHONE', '+79991234567'),
  email: getEnv('GOSUSLUGI_MOCK_EMAIL', 'applicant@example.com'),
  passport_series: getEnv('GOSUSLUGI_MOCK_PASSPORT_SERIES', '4500'),
  passport_number: getEnv('GOSUSLUGI_MOCK_PASSPORT_NUMBER', '123456'),
  snils: getEnv('GOSUSLUGI_MOCK_SNILS', '123-456-789 00')
});

module.exports = {
  getGosuslugiProfile
};
