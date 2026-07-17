export const SITE = {
  title: "The Kitchen Sale",
  eyebrow: "Private kitchen clear-out",
  intro:
    "We are Erasmus students selling kitchen items that we cannot take home. Everything is used but still in good condition unless stated otherwise.",
  pickup: "Pickup details available from the seller",
  contactUrl: import.meta.env.VITE_CONTACT_URL || "",
  contactLabel: import.meta.env.VITE_CONTACT_LABEL || "Contact the seller",
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || "cucina2026",
  imageBase:
    "https://raw.githubusercontent.com/miscigiacomo-sketch/KITCHEN/main/photos/photos",
};

export const CATEGORIES = [
  "Pots",
  "Pans",
  "Colanders",
  "Baking tins",
  "Appliances & misc",
  "Plates",
  "Bowls",
  "Cutlery",
  "Utensils & boards",
  "Glasses & mugs",
  "Vases",
  "Dish racks & cloths",
];

export const STATUSES = ["Available", "Reserved", "Sold"];
