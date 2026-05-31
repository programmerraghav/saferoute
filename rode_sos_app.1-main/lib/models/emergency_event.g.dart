// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'emergency_event.dart';

// **************************************************************************
// TypeAdapterGenerator
// **************************************************************************

class EmergencyEventAdapter extends TypeAdapter<EmergencyEvent> {
  @override
  final int typeId = 1;

  @override
  EmergencyEvent read(BinaryReader reader) {
    final numOfFields = reader.readByte();
    final fields = <int, dynamic>{
      for (int i = 0; i < numOfFields; i++) reader.readByte(): reader.read(),
    };
    return EmergencyEvent(
      eventId: fields[0] as String,
      eventType: fields[1] as String,
      latitude: fields[2] as double,
      longitude: fields[3] as double,
      riskScore: fields[4] as double,
      timestamp: fields[5] as DateTime,
      status: fields[6] as String,
      isSynced: fields[7] as bool,
    );
  }

  @override
  void write(BinaryWriter writer, EmergencyEvent obj) {
    writer
      ..writeByte(8)
      ..writeByte(0)
      ..write(obj.eventId)
      ..writeByte(1)
      ..write(obj.eventType)
      ..writeByte(2)
      ..write(obj.latitude)
      ..writeByte(3)
      ..write(obj.longitude)
      ..writeByte(4)
      ..write(obj.riskScore)
      ..writeByte(5)
      ..write(obj.timestamp)
      ..writeByte(6)
      ..write(obj.status)
      ..writeByte(7)
      ..write(obj.isSynced);
  }

  @override
  int get hashCode => typeId.hashCode;

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EmergencyEventAdapter &&
          runtimeType == other.runtimeType &&
          typeId == other.typeId;
}
