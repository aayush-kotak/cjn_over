/**
 * All predefined bag names grouped by category.
 * This is the single source of truth — used in CashSale, DebitSale, EditTransactionModal.
 */
export const BAG_CATALOG = {
  KHOL: [
    'Madhav', 'Nandan', 'Patel', 'Gopal',
    'Dimet Kadi', 'Avadh', 'Mayank'
  ],
  BHUSO: [
    'Diamond', 'Makai', 'Chana Chunni', 'Keshar Malai',
    'Dairy Malai', 'Double Ghoda Malai', 'Jaddu Bhushu', 'Unnati'
  ],
  TIWANA: [
    'Tiwana 8000', 'Tiwana 10000', 'Tiwana Protien +',
    'Tiwana Protien 35', 'Tiwana T-20', 'Tiwana T-20 Dry',
    'Tiwana T-20 Fresher', 'Calf Starter', 'Hiefer Dry'
  ]
};

/** Flat list of all bag names */
export const ALL_BAG_NAMES = Object.values(BAG_CATALOG).flat();
