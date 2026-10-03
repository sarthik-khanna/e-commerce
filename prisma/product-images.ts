/**
 * Demo product photos, keyed by SKU (SKU-1000 … SKU-1026 from prisma/seed.ts).
 * Each product gets a cover photo and a second photo for the gallery.
 *
 * Photos come from Unsplash and Pexels. Both licences allow free use in apps and
 * websites without attribution (https://unsplash.com/license, https://www.pexels.com/license/).
 * The URLs ask the CDN for a 1000×1000 crop, so files stay small (~100–200 KB).
 */
const unsplash = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&h=1000&q=80`;
const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1000&h=1000`;

export const PRODUCT_IMAGES: Record<string, string[]> = {
  // Electronics
  "SKU-1000": [unsplash("photo-1505740420928-5e560c06d30e"), unsplash("photo-1546435770-a3e426bf472b")], // headphones
  "SKU-1001": [unsplash("photo-1660844817855-3ecc7ef21f12"), unsplash("photo-1632794716789-42d9995fb5b6")], // smart watch
  "SKU-1002": [unsplash("photo-1582978571763-2d039e56f0c3"), unsplash("photo-1507878566509-a0dbe19677a5")], // speaker
  "SKU-1003": [unsplash("photo-1586254116951-5263e2cdb44c"), unsplash("photo-1517320069935-381614f8c1e5")], // charger
  "SKU-1004": [unsplash("photo-1618384887929-16ec33fab9ef"), unsplash("photo-1547394765-185e1e68f34e")], // keyboard
  "SKU-1005": [unsplash("photo-1562878671-b3efe27953b9"), unsplash("photo-1513193643083-07325d25a4b0")], // action camera
  // Fashion
  "SKU-1006": [unsplash("photo-1581655353564-df123a1eb820"), unsplash("photo-1651761179569-4ba2aa054997")], // t-shirt
  "SKU-1007": [unsplash("photo-1714729382668-7bc3bb261662"), unsplash("photo-1637069585336-827b298fe84a")], // jeans
  "SKU-1008": [unsplash("photo-1727061180303-d91cdeca6f9c"), unsplash("photo-1603808033192-082d6919d3e1")], // sneakers
  "SKU-1009": [unsplash("photo-1619603364937-8d7af41ef206"), unsplash("photo-1539533113208-f6df8cc8b543")], // overcoat
  "SKU-1010": [unsplash("photo-1557669246-38f5ebeb001c"), unsplash("photo-1474376962954-d8a681cc53b2")], // backpack
  // Home & Kitchen
  "SKU-1011": [unsplash("photo-1584990347193-6bebebfeaeee"), unsplash("photo-1584990347449-fd98bc063110")], // cookware
  "SKU-1012": [unsplash("photo-1551807306-4bcd16b92a41"), unsplash("photo-1484632105053-8662f3194e7f")], // dinner set
  "SKU-1013": [pexels(35285814), pexels(32928224)], // air fryer
  "SKU-1014": [unsplash("photo-1603905179139-db12ab535ca9"), unsplash("photo-1603897076223-17f346f02a03")], // candle
  "SKU-1015": [unsplash("photo-1629949009765-40fc74c9ec21"), unsplash("photo-1691207699465-603a8be4f7e3")], // pillow
  // Sports
  "SKU-1016": [unsplash("photo-1646239646963-b0b9be56d6b5"), unsplash("photo-1637157216470-d92cd2edb2e8")], // yoga mat
  "SKU-1017": [unsplash("photo-1725289767222-3444016c70ce"), unsplash("photo-1638536532686-d610adfc8e5c")], // dumbbells
  "SKU-1018": [unsplash("photo-1726133731483-d4b8bcabeb43"), unsplash("photo-1562183241-b937e95585b6")], // running shoes
  "SKU-1019": [unsplash("photo-1602143407151-7111542de6e8"), unsplash("photo-1625708458528-802ec79b1ed8")], // water bottle
  // Books (generic book/desk photos, not real covers)
  "SKU-1020": [unsplash("photo-1515879218367-8466d910aaa4"), unsplash("photo-1576872381149-7847515ce5d8")],
  "SKU-1021": [unsplash("photo-1585055462747-0bbcbd0e2167"), unsplash("photo-1517770413964-df8ca61194a6")],
  "SKU-1022": [unsplash("photo-1607799279861-4dd421887fb3"), unsplash("photo-1461749280684-dccba630e2f6")],
  "SKU-1023": [unsplash("photo-1485990005353-9abcf694f3e7"), unsplash("photo-1456513080510-7bf3a84b82f8")],
  // Beauty
  "SKU-1024": [unsplash("photo-1713768704571-6aeb0d0e5105"), unsplash("photo-1710410815589-dd83514104d0")], // serum
  "SKU-1025": [unsplash("photo-1673350963924-cb4267d9b6eb"), unsplash("photo-1524230616393-d6229fcd2eff")], // beard kit
  "SKU-1026": [unsplash("photo-1631214499500-2e34edcaccfe"), unsplash("photo-1625093742435-6fa192b6fb10")], // lipstick
};

/** Image rows for a product, ready for Prisma (`alt` text doubles as the accessible name). */
export function imagesFor(sku: string, name: string) {
  return (PRODUCT_IMAGES[sku] ?? []).map((url, position) => ({
    url,
    alt: position === 0 ? name : `${name}, view ${position + 1}`,
    position,
  }));
}
