// This function acts as a secure backend proxy to the Gemini API.
// It receives a prompt from the user's browser, adds the secret API key,
// and then forwards the request to Google's servers.

exports.handler = async function(event, context) {
    // We only want to handle POST requests from our frontend.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Parse the user's prompt from the incoming request body.
        const { prompt: userInput } = JSON.parse(event.body);

        if (!userInput) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Vui lòng cung cấp nội dung để phân tích.' })
            };
        }

        // Securely retrieve the API key from Netlify's environment variables.
        // This key is never exposed to the user's browser.
        const apiKey = process.env.GEMINI_API_KEY;
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        // Construct the full prompt with instructions for the AI model.
        const prompt = `Bạn là một nhà phân tích giao dịch chuyên nghiệp theo phương pháp Smart Money Concept (SMC). Nhiệm vụ của bạn là phân tích kịch bản thị trường do người dùng cung cấp. KHÔNG đưa ra lời khuyên tài chính. Thay vào đó, hãy tập trung vào:
1.  Xác định xu hướng chính và cấu trúc thị trường (BOS, CHoCH).
2.  Chỉ ra các Vùng Quan Tâm (POI) tiềm năng như Order Blocks, Fair Value Gaps (FVG).
3.  Phân tích các vùng thanh khoản (Liquidity) có thể bị nhắm tới.
4.  Gợi ý các tín hiệu xác nhận cần tìm kiếm trên khung thời gian thấp hơn.
Sử dụng định dạng Markdown với các tiêu đề rõ ràng.
Kịch bản của người dùng như sau: "${userInput}"`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        // Forward the request to the Google Gemini API.
        const response = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // Handle potential errors from the Gemini API.
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', errorText);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Lỗi từ Gemini API: ${response.statusText}` })
            };
        }

        const result = await response.json();
        
        // Extract the text from the AI's response.
        const text = result.candidates[0]?.content?.parts[0]?.text || "Không nhận được phản hồi từ AI.";

        // Send the successful response back to the user's browser.
        return {
            statusCode: 200,
            body: JSON.stringify({ text: text })
        };

    } catch (error) {
        // Handle any unexpected errors in our function.
        console.error('Function Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Đã có lỗi xảy ra trong quá trình xử lý.' })
        };
    }
};
