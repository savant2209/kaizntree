import { Button } from '@mantine/core';

function App() {
  return (
    // As classes do Tailwind cuidam do layout e alinhamento
    <div className="min-h-screen bg-gray-100 flex items-center justify-center flex-col gap-4">
      <h1 className="text-3xl font-bold text-gray-800">
        Setup Concluído
      </h1>
      
      {/* O Mantine cuida do componente visual */}
      <Button size="lg" color="blue">
        Botão do Mantine
      </Button>
    </div>
  )
}

export default App