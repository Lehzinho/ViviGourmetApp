import { PrismaClient, IngredientType, RecipeType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const itemsWithSubRecipe = await prisma.recipeItem.findMany({
    where: { subRecipeId: { not: null } },
    include: {
      subRecipe: true,
    },
  });

  if (itemsWithSubRecipe.length === 0) {
    console.log("Nenhum RecipeItem com subRecipeId encontrado. Nada a migrar.");
    return;
  }

  console.log(`Migrando ${itemsWithSubRecipe.length} RecipeItem(s) com subRecipeId...`);

  const recipeIdToIngredientId = new Map<string, string>();

  for (const item of itemsWithSubRecipe) {
    const subRecipe = item.subRecipe!;

    let semifinishedIngredientId = recipeIdToIngredientId.get(subRecipe.id);

    if (!semifinishedIngredientId) {
      const existing = await prisma.ingredient.findUnique({
        where: { compositionRecipeId: subRecipe.id },
      });

      if (existing) {
        semifinishedIngredientId = existing.id;
      } else {
        const newIngredient = await prisma.ingredient.create({
          data: {
            companyId: subRecipe.companyId,
            name: subRecipe.name,
            unit: subRecipe.yieldUnit,
            type: IngredientType.SEMI_FINISHED,
            compositionRecipeId: subRecipe.id,
          },
        });
        semifinishedIngredientId = newIngredient.id;

        await prisma.recipe.update({
          where: { id: subRecipe.id },
          data: { type: RecipeType.COMPOSITION },
        });

        console.log(`  Criado SEMI_FINISHED "${subRecipe.name}" (id: ${newIngredient.id})`);
      }

      recipeIdToIngredientId.set(subRecipe.id, semifinishedIngredientId);
    }

    await prisma.recipeItem.update({
      where: { id: item.id },
      data: {
        ingredientId: semifinishedIngredientId,
        subRecipeId: null,
      },
    });

    console.log(`  RecipeItem ${item.id}: subRecipeId → ingredientId (${semifinishedIngredientId})`);
  }

  const orphaned = await prisma.recipeItem.count({
    where: { ingredientId: null },
  });
  if (orphaned > 0) {
    throw new Error(`${orphaned} RecipeItem(s) ainda sem ingredientId após migração!`);
  }

  console.log("Migração concluída com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
