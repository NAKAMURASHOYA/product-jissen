// src/app/[slug]/default.tsx
// なぜこれが必要か: 
// 並列ルートが使用される階層で、特定のルートがマッチしない場合に 
// Next.js がフォールバックとして表示するためのファイルです。

export default function Default() {
    return null; // 何も表示したくない場合は null を返せばOKです
}