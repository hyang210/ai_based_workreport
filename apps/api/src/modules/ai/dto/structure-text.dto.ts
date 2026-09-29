import { IsOptional, IsString } from 'class-validator';

export class StructureTextDto {
  @IsString()
  text: string;

  // 설비 이력 Context (설계서 5.5) — 선택된 설비의 최근 이력 요약을 함께 전달하면
  // "관련 이력"으로만 참고되고, 원인으로 단정되지 않도록 프롬프트에서 통제한다.
  @IsOptional()
  @IsString()
  equipmentContext?: string;
}
