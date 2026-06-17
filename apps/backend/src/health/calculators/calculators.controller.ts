import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import {
  BmiDto,
  BodyFatNavyDto,
  LeanBodyMassDto,
  WaistToHipDto,
  FfmiDto,
  BmrDto,
  TdeeDto,
  CalorieGoalDto,
  OneRmDto,
  WilksDto,
  DotsDto,
  VolumeLoadDto,
  InolDto,
  MaxHeartRateDto,
  HeartRateZonesDto,
  Vo2MaxDto,
  PaceDto,
  MetDto,
  MacroDto,
  ProteinDto,
  WaterIntakeDto,
  WeightGoalTimelineDto,
} from './dto/calculators.dto';
import { CalculatorsService } from './calculators.service';
import { Public } from '../../idm/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { SkipAudit } from '@app/common/audit';

@ApiTags('calculators')
@Public()
@SkipAudit()
@Throttle({ default: { ttl: 10000, limit: 40 } })
@Controller({
  path: 'calculators',
  version: '1',
})
export class CalculatorsController {
  constructor(private readonly calculatorsService: CalculatorsService) {}

  // ==================== BODY COMPOSITION ====================

  @Post('bmi')
  @ApiOperation({ summary: 'Calculate Body Mass Index (BMI)' })
  @ApiOkResponse({ description: 'BMI calculation result' })
  calculateBmi(@Body() dto: BmiDto) {
    return this.calculatorsService.calculateBmi(dto);
  }

  @Post('body-fat/navy')
  @ApiOperation({
    summary: 'Calculate body fat percentage using US Navy method',
  })
  @ApiOkResponse({ description: 'Body fat percentage result' })
  calculateBodyFatNavy(@Body() dto: BodyFatNavyDto) {
    return this.calculatorsService.calculateBodyFatNavy(dto);
  }

  @Post('lean-body-mass')
  @ApiOperation({
    summary: 'Calculate lean body mass from body fat percentage',
  })
  @ApiOkResponse({ description: 'Lean body mass result' })
  calculateLeanBodyMass(@Body() dto: LeanBodyMassDto) {
    return this.calculatorsService.calculateLeanBodyMass(dto);
  }

  @Post('waist-to-hip')
  @ApiOperation({ summary: 'Calculate waist-to-hip ratio' })
  @ApiOkResponse({ description: 'Waist-to-hip ratio result' })
  calculateWaistToHip(@Body() dto: WaistToHipDto) {
    return this.calculatorsService.calculateWaistToHip(dto);
  }

  @Post('ffmi')
  @ApiOperation({ summary: 'Calculate Fat-Free Mass Index (FFMI)' })
  @ApiOkResponse({ description: 'FFMI calculation result' })
  calculateFfmi(@Body() dto: FfmiDto) {
    return this.calculatorsService.calculateFfmi(dto);
  }

  // ==================== CALORIC NEEDS ====================

  @Post('bmr')
  @ApiOperation({ summary: 'Calculate Basal Metabolic Rate (BMR)' })
  @ApiOkResponse({ description: 'BMR calculation result' })
  calculateBmr(@Body() dto: BmrDto) {
    return this.calculatorsService.calculateBmr(dto);
  }

  @Post('tdee')
  @ApiOperation({ summary: 'Calculate Total Daily Energy Expenditure (TDEE)' })
  @ApiOkResponse({ description: 'TDEE calculation result' })
  calculateTdee(@Body() dto: TdeeDto) {
    return this.calculatorsService.calculateTdee(dto);
  }

  @Post('calorie-goal')
  @ApiOperation({
    summary: 'Calculate daily calorie goal based on weight goal',
  })
  @ApiOkResponse({ description: 'Calorie goal result' })
  calculateCalorieGoal(@Body() dto: CalorieGoalDto) {
    return this.calculatorsService.calculateCalorieGoal(dto);
  }

  // ==================== STRENGTH & PERFORMANCE ====================

  @Post('one-rm')
  @ApiOperation({ summary: 'Calculate one-rep max (1RM) from submaximal lift' })
  @ApiOkResponse({
    description: '1RM calculation result with percentage chart',
  })
  calculateOneRm(@Body() dto: OneRmDto) {
    return this.calculatorsService.calculateOneRm(dto);
  }

  @Post('wilks')
  @ApiOperation({ summary: 'Calculate Wilks score for powerlifting' })
  @ApiOkResponse({ description: 'Wilks coefficient and score' })
  calculateWilks(@Body() dto: WilksDto) {
    return this.calculatorsService.calculateWilks(dto);
  }

  @Post('dots')
  @ApiOperation({ summary: 'Calculate DOTS score for powerlifting' })
  @ApiOkResponse({ description: 'DOTS coefficient and score' })
  calculateDots(@Body() dto: DotsDto) {
    return this.calculatorsService.calculateDots(dto);
  }

  @Post('volume-load')
  @ApiOperation({ summary: 'Calculate training volume load and tonnage' })
  @ApiOkResponse({ description: 'Volume load result' })
  calculateVolumeLoad(@Body() dto: VolumeLoadDto) {
    return this.calculatorsService.calculateVolumeLoad(dto);
  }

  @Post('inol')
  @ApiOperation({ summary: 'Calculate Intensity Number of Lifts (INOL)' })
  @ApiOkResponse({ description: 'INOL calculation with recommendation' })
  calculateInol(@Body() dto: InolDto) {
    return this.calculatorsService.calculateInol(dto);
  }

  // ==================== CARDIOVASCULAR ====================

  @Post('max-heart-rate')
  @ApiOperation({ summary: 'Calculate maximum heart rate' })
  @ApiOkResponse({ description: 'Max heart rate result' })
  calculateMaxHeartRate(@Body() dto: MaxHeartRateDto) {
    return this.calculatorsService.calculateMaxHeartRate(dto);
  }

  @Post('heart-rate-zones')
  @ApiOperation({ summary: 'Calculate heart rate training zones' })
  @ApiOkResponse({ description: 'Heart rate zones' })
  calculateHeartRateZones(@Body() dto: HeartRateZonesDto) {
    return this.calculatorsService.calculateHeartRateZones(dto);
  }

  @Post('vo2-max')
  @ApiOperation({ summary: 'Estimate VO2 max from resting heart rate' })
  @ApiOkResponse({ description: 'VO2 max estimate with fitness level' })
  calculateVo2Max(@Body() dto: Vo2MaxDto) {
    return this.calculatorsService.calculateVo2Max(dto);
  }

  @Post('pace')
  @ApiOperation({ summary: 'Calculate running/cycling pace and speed' })
  @ApiOkResponse({ description: 'Pace calculations' })
  calculatePace(@Body() dto: PaceDto) {
    return this.calculatorsService.calculatePace(dto);
  }

  @Post('met')
  @ApiOperation({ summary: 'Calculate calories burned using MET values' })
  @ApiOkResponse({ description: 'Calorie burn estimate' })
  calculateMet(@Body() dto: MetDto) {
    return this.calculatorsService.calculateMet(dto);
  }

  // ==================== MACROS & NUTRITION ====================

  @Post('macros')
  @ApiOperation({ summary: 'Calculate macronutrient targets' })
  @ApiOkResponse({ description: 'Macro breakdown in grams and calories' })
  calculateMacros(@Body() dto: MacroDto) {
    return this.calculatorsService.calculateMacros(dto);
  }

  @Post('protein')
  @ApiOperation({ summary: 'Calculate daily protein recommendation' })
  @ApiOkResponse({ description: 'Protein recommendation' })
  calculateProtein(@Body() dto: ProteinDto) {
    return this.calculatorsService.calculateProtein(dto);
  }

  @Post('water-intake')
  @ApiOperation({ summary: 'Calculate daily water intake recommendation' })
  @ApiOkResponse({ description: 'Water intake recommendation' })
  calculateWaterIntake(@Body() dto: WaterIntakeDto) {
    return this.calculatorsService.calculateWaterIntake(dto);
  }

  // ==================== PROGRESS & GOALS ====================

  @Post('weight-goal-timeline')
  @ApiOperation({ summary: 'Calculate timeline to reach weight goal' })
  @ApiOkResponse({ description: 'Weight goal timeline' })
  calculateWeightGoalTimeline(@Body() dto: WeightGoalTimelineDto) {
    return this.calculatorsService.calculateWeightGoalTimeline(dto);
  }
}
