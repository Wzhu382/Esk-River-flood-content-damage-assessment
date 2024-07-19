// Zoom to area of interest\
Map.centerObject(Esk_river);\
Map.addLayer(Esk_river);\
\
// Load Sentinel data\
var collection = ee.ImageCollection('COPERNICUS/S1_GRD')\
        .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))\
        .filter(ee.Filter.eq('instrumentMode', 'IW'))\
        .filter(ee.Filter.or(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'),\
                ee.Filter.eq('orbitProperties_pass', 'ASCENDING')))\
        \
        \
var before = collection.filter(ee.Filter.date('2023-01-01','2023-01-30')).filterBounds(Esk_river)        \
var after = collection.filter(ee.Filter.date('2023-02-12','2023-02-15')).filterBounds(Esk_river) \
\
\
var before_image = before.select('VH').mosaic().clip(Esk_river)\
var after_image = after.select('VH').mosaic().clip(Esk_river)\
\
Map.addLayer(before_image, \{min:-25,max:0\},'Before')\
Map.addLayer(after_image, \{min:-25,max:0\},'After')\
\
\
\
//this function is to convert the logarithmic value of a given image into its natural or linear value.\
function toNatural(img) \{\
  return ee.Image(10.0).pow(img.select(0).divide(10.0))\
\}\
\
//The purpose of this function is to convert image from natural scale to decibel values.\
function toDB(img) \{\
  return ee.Image(img).log10().multiply(10.0);\
\}\
\
//RefinedLee is a widely used filtering method for denoising SAR data.\
function RefinedLee(img) \{\
  // Define a kernel.\
  var kernel = ee.Kernel.square(3); \
\
  // Compute local mean and variance on the image.\
  var mean = img.reduceNeighborhood(\{\
    reducer: ee.Reducer.mean(),\
    kernel: kernel\
  \});\
  var variance = img.reduceNeighborhood(\{\
    reducer: ee.Reducer.variance(),\
    kernel: kernel\
  \});\
\
  // Compute a/b ratio.\
  var a = variance.divide(mean.multiply(mean));\
\
  // Refined Lee filter computation\
  var b = ee.Image(1).add(a.divide(a.add(1)));\
  var sigmaV = b.sqrt().multiply(mean);\
  \
  var alpha = ee.Image(1).divide(ee.Image(1).add(a));\
  var result = mean.add(alpha.multiply(img.subtract(mean)));\
\
  return result;\
\}\
\
//Noise filter two SAR images and keep them in decibel units\
var before_filter = ee.Image(toDB(RefinedLee(toNatural(before_image))))\
var after_filter = ee.Image(toDB(RefinedLee(toNatural(after_image))))\
\
//Add the two filtered images as layers\
Map.addLayer(before_filter, \{min:-25,max:0\},'Before_Filter')\
Map.addLayer(after_filter, \{min:-25,max:0\},'After_Filter')\
\
/*These code defines two flood masks. It looks for those \
pixels over land where the SAR reflectance was greater than -20dB(land)before the flood, \
and less than -20dB(land cover by water) after the flood.*/\
var flood = before_filter.gt(-20).and(after_filter.lt(-20))\
// The code updates the flood mask, retaining only those pixels with a value of 1 (i.e. flooded areas)\
var floodMask = flood.updateMask(flood.eq(1))\
\
//same process for the image before the flood and update water mask\
var water = before_filter.lt(-20).and(after_filter.lt(-20))\
var waterMask = water.updateMask(water.eq(1))\
\
//Add a flood mask to the map and color it yellow.\
Map.addLayer(floodMask, \{palette:['Yellow']\},"Flood water")\
//Add a body of water mask to the map and represent it in blue\
Map.addLayer(waterMask, \{palette:['Blue']\},"Water body")\
}