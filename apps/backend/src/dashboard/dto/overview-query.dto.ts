import { IsOptional, IsEnum } from 'class-validator';

export enum RangeFilter {
  THIS_MONTH = 'this_month',
  LAST_30D = 'last_30d',
  THIS_QUARTER = 'this_quarter',
  YTD = 'ytd',
  ALL = 'all',
}

export class OverviewQueryDto {
  @IsOptional()
  @IsEnum(RangeFilter, { message: 'range must be one of this_month, last_30d, this_quarter, ytd, all' })
  range?: RangeFilter = RangeFilter.THIS_MONTH;
}
