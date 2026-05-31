// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'telemetry_log.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class TelemetryLogAdapter extends TypeAdapter<TelemetryLog> {
  @override
  final int typeId = 0;

  @override
  TelemetryLog read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return TelemetryLog(
      latitude: fields[0] as double,
      longitude: fields[1] as double,
      speedKmh: fields[2] as double,
      accelerationG: fields[3] as double,
      timestamp: fields[4] as DateTime,
      isSynced: fields[5] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, TelemetryLog obj) {
    writer
      ..writeByte(6)
      ..writeByte(0)
      ..write(obj.latitude)
      ..writeByte(1)
      ..write(obj.longitude)
      ..writeByte(2)
      ..write(obj.speedKmh)
      ..writeByte(3)
      ..write(obj.accelerationG)
      ..writeByte(4)
      ..write(obj.timestamp)
      ..writeByte(5)
      ..write(obj.isSynced);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is TelemetryLogAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
