import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // tsconfig.json usa "jsx": "preserve" (o transform de JSX de verdade é
  // do Next.js/SWC em produção) — o Vitest, sozinho, não transforma JSX;
  // o plugin oficial do Vite para React resolve isso só para os testes
  // de componente (tests/components/*.test.tsx).
  plugins: [react()],
  resolve: {
    alias: {
      // Espelha o alias "@/*" -> "./*" já configurado em tsconfig.json,
      // usado pelas rotas de API e componentes do Next.js.
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // O pacote real "server-only" lança erro fora do bundler do
      // Next.js — substituído por um stub vazio só durante os testes.
      "server-only": fileURLToPath(new URL("./tests/mocks/server-only.ts", import.meta.url)),
    },
  },
  test: {
    // Padrão global "node" (a maioria dos testes é backend puro); testes
    // de componente que precisam de DOM usam a diretiva de arquivo
    // `// @vitest-environment jsdom` para sobrescrever, só para si
    // (ver tests/components/).
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // tests/api/pipeline-route.test.ts exercita a rota real, que agora
    // depende do Pipeline Service composto com PrismaPipelineRepository
    // — precisa de DATABASE_URL carregado, assim como o Next.js já faz
    // automaticamente (mas o Vitest, sozinho, não). O matcher jest-dom é
    // seguro de carregar globalmente mesmo em ambiente "node": só estende
    // `expect`, as asserções em si só rodam em testes com DOM real.
    setupFiles: ["dotenv/config", "./tests/setup.ts"],
  },
});
