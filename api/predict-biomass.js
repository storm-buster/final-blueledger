export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { B2, B3, B4, B8, species } = req.body;
    
    // Generate realistic mock predictions based on input
    const baseBiomass = 1000;
    const ndvi = (B8 - B4) / (B8 + B4);
    const evi = 2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1));
    const savi = ((B8 - B4) / (B8 + B4 + 0.5)) * 1.5;
    
    // Calculate predicted biomass with some variation
    const predicted_biomass = Math.round(baseBiomass + (ndvi * 500) + (Math.random() * 200 - 100));
    const confidence = Math.min(95, Math.max(70, 75 + (ndvi * 20) + (Math.random() * 10 - 5)));
    
    // Feature importance based on actual spectral data
    const feature_importance = {
      NDVI: Math.round(Math.abs(ndvi) * 100),
      EVI: Math.round(Math.abs(evi) * 80),
      SAVI: Math.round(Math.abs(savi) * 60),
      B2: Math.round(B2 * 1000),
      B3: Math.round(B3 * 800),
      B4: Math.round(B4 * 900),
      B8: Math.round(B8 * 400)
    };
    
    res.status(200).json({
      predicted_biomass,
      confidence: Math.round(confidence),
      ndvi: Math.round(ndvi * 1000) / 1000,
      evi: Math.round(evi * 1000) / 1000,
      savi: Math.round(savi * 1000) / 1000,
      feature_importance,
      input_data: { B2, B3, B4, B8, species }
    });
  } catch (error) {
    console.error('Biomass prediction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
