const exerciseDefinitions = [
  { name: 'Supino reto com barra', muscleGroup: 'chest' as const, equipment: 'Barra' },
  { name: 'Supino inclinado halter', muscleGroup: 'chest' as const, equipment: 'Halteres' },
  { name: 'Crucifixo na máquina', muscleGroup: 'chest' as const, equipment: 'Máquina' },
  { name: 'Puxada frontal', muscleGroup: 'back' as const, equipment: 'Polia' },
  { name: 'Remada curvada', muscleGroup: 'back' as const, equipment: 'Barra' },
  { name: 'Remada baixa', muscleGroup: 'back' as const, equipment: 'Polia' },
  { name: 'Desenvolvimento militar', muscleGroup: 'shoulders' as const, equipment: 'Barra' },
  { name: 'Elevação lateral', muscleGroup: 'shoulders' as const, equipment: 'Halteres' },
  { name: 'Rosca direta', muscleGroup: 'biceps' as const, equipment: 'Barra' },
  { name: 'Rosca alternada', muscleGroup: 'biceps' as const, equipment: 'Halteres' },
  { name: 'Tríceps testa', muscleGroup: 'triceps' as const, equipment: 'Barra W' },
  { name: 'Tríceps corda', muscleGroup: 'triceps' as const, equipment: 'Polia' },
  { name: 'Agachamento livre', muscleGroup: 'legs' as const, equipment: 'Barra' },
  { name: 'Leg press 45°', muscleGroup: 'legs' as const, equipment: 'Máquina' },
  { name: 'Cadeira extensora', muscleGroup: 'legs' as const, equipment: 'Máquina' },
  { name: 'Mesa flexora', muscleGroup: 'legs' as const, equipment: 'Máquina' },
  { name: 'Hip thrust', muscleGroup: 'glutes' as const, equipment: 'Barra' },
  { name: 'Stiff', muscleGroup: 'glutes' as const, equipment: 'Halteres' },
  { name: 'Panturrilha em pé', muscleGroup: 'legs' as const, equipment: 'Máquina' },
  { name: 'Abdominal infra', muscleGroup: 'core' as const, equipment: 'Peso corporal' },
  { name: 'Prancha', muscleGroup: 'core' as const, equipment: 'Peso corporal' },
  { name: 'Esteira', muscleGroup: 'cardio' as const, equipment: 'Esteira' },
  { name: 'Bicicleta ergométrica', muscleGroup: 'cardio' as const, equipment: 'Bicicleta' },
  { name: 'Burpee', muscleGroup: 'full_body' as const, equipment: 'Peso corporal' },
];

export const globalExercises = exerciseDefinitions.map((exercise) => ({
  ...exercise,
  instructions: `Demonstração de ${exercise.name.toLocaleLowerCase('pt-BR')}, com ${exercise.equipment.toLocaleLowerCase('pt-BR')}. Ajuste o equipamento, mantenha o movimento controlado e respeite a amplitude confortável. Dados fictícios para teste de interface; não constituem prescrição individual.`,
}));

export const trainerExercises = [
  { name: 'Agachamento goblet — demo', muscleGroup: 'legs' as const, equipment: 'Halter' },
  { name: 'Remada unilateral — demo', muscleGroup: 'back' as const, equipment: 'Halter e banco' },
  { name: 'Ponte de glúteos — demo', muscleGroup: 'glutes' as const, equipment: 'Colchonete' },
  { name: 'Prancha lateral — demo', muscleGroup: 'core' as const, equipment: 'Colchonete' },
].map((exercise) => ({
  ...exercise,
  instructions: `Exercício privado de demonstração: ${exercise.name}. Posicione o equipamento, estabilize o tronco e execute cada repetição lentamente. Conteúdo fictício para QA, sem prescrição individual.`,
}));
