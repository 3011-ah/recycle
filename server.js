const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const NodeCache = require("node-cache"); // Cache to reduce API calls

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.VITE_GOOGLE_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`;
const CARBON_API_URL = "https://api.carboninterface.com/v1/estimates";
const CARBON_API_KEY = process.env.CARBON_API_KEY;

const cache = new NodeCache({ stdTTL: 600 }); // Cache responses for 10 minutes

// Route to analyze waste item
app.post("/api/gemini", async (req, res) => {
    try {
        const requestData = { contents: req.body.contents };
        
        // Check cache first
        const cachedResponse = cache.get(req.body.contents);
        if (cachedResponse) return res.json(cachedResponse);

        const response = await axios.post(API_URL, requestData, {
            headers: { "Content-Type": "application/json" },
        });

        cache.set(req.body.contents, response.data); // Store in cache
        res.json(response.data);
    } catch (error) {
        console.error("Error calling Gemini API:", error.response?.data || error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to estimate carbon footprint
app.post("/api/carbon", async (req, res) => {
    try {
        const { material, weight } = req.body; // Material type and weight in kg
        
        const response = await axios.post(CARBON_API_URL, {
            type: "material",
            weight_value: weight,
            weight_unit: "kg",
            material,
        }, {
            headers: {
                Authorization: `Bearer ${CARBON_API_KEY}`,
                "Content-Type": "application/json",
            },
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error fetching carbon data:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to calculate carbon footprint" });
    }
});

app.listen(5001, () => {
    console.log("Server running on port 5001");
});
