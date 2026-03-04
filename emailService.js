const axios = require("axios");

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const response = await axios.post(
      "https://api.ahasend.com/v1/email/send",
      {
        from: "Gbairai <admin@gbairai.fun>",
        to: [to],
        subject: subject,
        html: htmlContent
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.AHASEND_API_KEY
        }
      }
    );
    console.log("Email envoyé :", response.data);
  } catch (error) {
    console.error("Erreur envoi email :", error.response?.data || error.message);
    throw error;
  }
};

export default sendEmail;
