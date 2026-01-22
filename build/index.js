#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
// 1. 定义服务器信息
// 注意：这里的 name 已经改成了您的项目名 mcp-server-rwa
const server = new Server({
    name: "mcp-server-rwa",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
    },
});
// 2. 定义工具 (Tools) - 告诉 AI 我们能查价格
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_crypto_price",
                description: "Get the current price of a cryptocurrency or RWA token in USD",
                inputSchema: {
                    type: "object",
                    properties: {
                        coin_id: {
                            type: "string",
                            description: "The CoinGecko API ID of the coin (e.g., 'bitcoin', 'ethereum', 'ondo-finance', 'tether-gold')",
                        },
                    },
                    required: ["coin_id"],
                },
            },
        ],
    };
});
// 3. 实现工具逻辑
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_crypto_price") {
        // 验证参数
        const params = request.params.arguments;
        const coinId = params.coin_id.toLowerCase();
        try {
            // 调用 CoinGecko API (不需要 Key)
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
            const data = await response.json();
            // 检查是否查到了数据
            if (!data[coinId]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: Could not find price for '${coinId}'. Please check if the CoinGecko ID is correct.`,
                        },
                    ],
                    isError: true,
                };
            }
            const price = data[coinId].usd;
            return {
                content: [
                    {
                        type: "text",
                        text: `The current price of ${coinId} is $${price} USD.`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to fetch price: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    throw new Error("Tool not found");
});
// 4. 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
