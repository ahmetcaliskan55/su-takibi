// Tarih testleri makinenin saat diliminden bağımsız olsun (UTC çalışan sunucularda da yerel-gün hatalarını yakalasın).
module.exports = async () => {
  process.env.TZ = 'Europe/Istanbul';
};
