import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export class ApiErrorDetail {
  @ApiProperty({ example: 'UNAUTHORIZED' })
  code!: string;

  @ApiProperty({ example: 'Invalid email or password' })
  message!: string;

  @ApiProperty({ example: {} })
  details!: Record<string, unknown>;
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: ApiErrorDetail })
  error!: ApiErrorDetail;
}

const dataResponseCache = new Map<string, Type>();

export function ApiDataResponse<T extends Type>(dataDto: T): Type {
  const key = dataDto.name;
  const cached = dataResponseCache.get(key);
  if (cached) return cached;

  class DataResponseDto {
    @ApiProperty({ type: dataDto })
    data!: InstanceType<T>;
  }

  Object.defineProperty(DataResponseDto, 'name', {
    value: `DataResponse${key}`,
  });

  dataResponseCache.set(key, DataResponseDto);
  return DataResponseDto;
}

export function ApiDataArrayResponse<T extends Type>(dataDto: T): Type {
  const key = `Array${dataDto.name}`;
  const cached = dataResponseCache.get(key);
  if (cached) return cached;

  class DataArrayResponseDto {
    @ApiProperty({ type: [dataDto] })
    data!: Array<InstanceType<T>>;

    @ApiProperty({ type: String, nullable: true, example: null })
    nextCursor!: string | null;
  }

  Object.defineProperty(DataArrayResponseDto, 'name', {
    value: `DataArrayResponse${key}`,
  });

  dataResponseCache.set(key, DataArrayResponseDto);
  return DataArrayResponseDto;
}

export function ApiSuccessResponse(
  status: number,
  description: string,
  dataDto: Type,
) {
  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiResponse({
      status,
      description,
      type: ApiDataResponse(dataDto),
    }),
  );
}

export function ApiPaginatedResponse(description: string, dataDto: Type) {
  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiResponse({
      status: 200,
      description,
      type: ApiDataArrayResponse(dataDto),
    }),
  );
}
