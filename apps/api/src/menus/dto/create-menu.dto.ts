import { IsBoolean, IsOptional, IsString, MinLength, Matches } from "class-validator";

export class CreateMenuDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
