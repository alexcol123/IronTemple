import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Fills real content (already verified correct — same movement, not just same
// name) for 3 of the 4 original hand-curated exercises that had no gif/twin.
// Cable Kickback is deliberately excluded: this dataset's "cable kickback" is
// a triceps exercise, not the glute one we actually have — left for a
// separate, verified lookup rather than risk wrong instructions.

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const UPDATES = [
  {
    name: "Barbell Shrug",
    gifUrl: "/exercises/videos/0095-dG7tG5y.gif",
    imageUrls: ["/exercises/images/0095-dG7tG5y.jpg"],
    instructions: [
      "Stand with your feet shoulder-width apart and hold a barbell in front of you with an overhand grip.",
      "Keep your arms straight and your back straight throughout the exercise.",
      "Lift your shoulders up towards your ears as high as possible, squeezing your traps at the top.",
      "Hold for a moment, then slowly lower your shoulders back down to the starting position.",
      "Repeat for the desired number of repetitions.",
    ],
    instructionsEs: [
      "Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra frente a ti con un agarre pronado.",
      "Mantén los brazos rectos y la espalda recta durante todo el ejercicio.",
      "Levanta los hombros hacia las orejas lo más alto posible, apretando los trapecios en la parte alta.",
      "Mantén la posición por un momento y luego baja lentamente los hombros de vuelta a la posición inicial.",
      "Repite el número de repeticiones deseado.",
    ],
  },
  {
    name: "Dumbbell Shrug",
    gifUrl: "/exercises/videos/0406-NJzBsGJ.gif",
    imageUrls: ["/exercises/images/0406-NJzBsGJ.jpg"],
    instructions: [
      "Stand with your feet shoulder-width apart and hold a dumbbell in each hand with your palms facing your body.",
      "Keep your arms straight and let the dumbbells hang by your sides.",
      "Raise your shoulders as high as possible, as if you are trying to touch your ears with your shoulders.",
      "Hold the contraction for a second, then slowly lower your shoulders back down to the starting position.",
      "Repeat for the desired number of repetitions.",
    ],
    instructionsEs: [
      "Ponte de pie con los pies separados a la altura de los hombros y sujeta una mancuerna en cada mano con las palmas hacia tu cuerpo.",
      "Mantén los brazos rectos y deja que las mancuernas cuelguen a tus costados.",
      "Eleva los hombros lo más alto posible, como si intentaras tocarte las orejas con ellos.",
      "Mantén la contracción durante un segundo, luego baja lentamente los hombros de vuelta a la posición inicial.",
      "Repite el número de repeticiones deseado.",
    ],
  },
  {
    name: "Barbell Curl",
    gifUrl: "/exercises/videos/0031-25GPyDY.gif",
    imageUrls: ["/exercises/images/0031-25GPyDY.jpg"],
    instructions: [
      "Stand up straight with your feet shoulder-width apart and hold a barbell with an underhand grip, palms facing forward.",
      "Keep your elbows close to your torso and exhale as you curl the weights while contracting your biceps.",
      "Continue to raise the bar until your biceps are fully contracted and the bar is at shoulder level.",
      "Hold the contracted position for a brief pause as you squeeze your biceps.",
      "Inhale as you slowly begin to lower the bar back to the starting position.",
      "Repeat for the desired number of repetitions.",
    ],
    instructionsEs: [
      "Ponte de pie con los pies separados a la altura de los hombros y sujeta una barra con un agarre supino, con las palmas mirando hacia delante.",
      "Mantén los codos cerca del torso y exhala mientras levantas el peso contrayendo los bíceps.",
      "Continúa levantando la barra hasta que los bíceps estén completamente contraídos y la barra esté a la altura de los hombros.",
      "Mantén la posición contraída durante una breve pausa mientras aprietas los bíceps.",
      "Inhala mientras comienzas a bajar lentamente la barra de vuelta a la posición inicial.",
      "Repite el número de repeticiones deseado.",
    ],
  },
];

async function run() {
  for (const u of UPDATES) {
    const result = await prisma.exerciseLibrary.updateMany({
      where: { name: u.name },
      data: {
        gifUrl: u.gifUrl,
        imageUrls: u.imageUrls,
        instructions: u.instructions,
        instructionsEs: u.instructionsEs,
      },
    });
    console.log(`${u.name}: updated ${result.count} row(s)`);
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
