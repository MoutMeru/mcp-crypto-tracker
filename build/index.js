#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
const server = new Server({
    name: "mcp-server-rwa", // 名字保持不变
    version: "0.1.1", // 注意：我帮你把版本号升级了
}, {
    capabilities: {
        tools: {},
    },
});
// 这是一个 RWA 资产的推荐列表，告诉 AI 我们支持哪些
const RWA_ASSETS = {
    "pax-gold": "PAX Gold (Physical Gold)",
    "tether-gold": "Tether Gold (Physical Gold)",
    "ondo-finance": "Ondo (US Treasuries)",
    "maple": "Maple Finance (Institutional Credit)",
    "centrifuge": "Centrifuge (Real World Credit)",
    "polymesh": "Polymesh (Security Tokens)",
    "propy": "Propy (Real Estate)"
};
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "list_supported_rwa",
                description: "List supported Real World Assets (RWA) tokens including Gold, Treasuries, and Credit.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_rwa_price",
                description: "Get the real-time price and market data of a specific RWA token.",
                inputSchema: {
                    type: "object",
                    properties: {
                        asset_id: {
                            type: "string",
                            description: "The ID of the RWA asset (e.g., 'pax-gold', 'ondo-finance'). Use list_supported_rwa to see options.",
                        },
                    },
                    required: ["asset_id"],
                },
            },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // 工具 1：列出支持的资产
    if (request.params.name === "list_supported_rwa") {
        return {
            content: [
                {
                    type: "text",
                    text: `Supported RWA Assets:\n${Object.entries(RWA_ASSETS).map(([id, desc]) => `- ${id}: ${desc}`).join("\n")}`,
                },
            ],
        };
    }
    // 工具 2：查询具体价格
    if (request.params.name === "get_rwa_price") {
        const params = request.params.arguments;
        const assetId = params.asset_id.toLowerCase();
        try {
            // 依然使用 CoinGecko 的免费 API，但我们只查 RWA
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`);
            const data = await response.json();
            if (!data[assetId]) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: RWA Asset '${assetId}' not found or API limit reached.`,
                        },
                    ],
                    isError: true,
                };
            }
            const info = data[assetId];
            return {
                content: [
                    {
                        type: "text",
                        text: `RWA Data for [${assetId.toUpperCase()}]:\nPrice: $${info.usd}\n24h Change: ${info.usd_24h_change.toFixed(2)}%\nMarket Cap: $${info.usd_market_cap.toLocaleString()}`,
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to fetch RWA data: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    throw new Error("Tool not found");
});
const transport = new StdioServerTransport();
await server.connect(transport);
