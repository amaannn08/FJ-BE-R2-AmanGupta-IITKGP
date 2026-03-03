export async function getRates() {
  // Static mock conversion rates relative to USD
  return {
    USD: 1,
    EUR: 0.9,
    GBP: 0.8,
    INR: 83,
    JPY: 150,
    CAD: 1.3,
    AUD: 1.5,
  };
}
