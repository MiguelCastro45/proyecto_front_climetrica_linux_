import axios from "axios";

const BASE_URL = "http://localhost:5000/api";

export const getClimateData = async (layer) => {
  try {
    const response = await axios.get(`${BASE_URL}/climate/${layer}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching climate data:", error);
    return null;
  }
};

export const downloadLayer = async (layer) => {
  try {
    const response = await axios.get(`${BASE_URL}/download/${layer}`);
    const blob = new Blob([JSON.stringify(response.data)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${layer}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading layer:", error);
  }
};
