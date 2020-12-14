import {
  Card,
  Classes,
  Colors,
  H4,
  H5,
  Icon,
  NumericInput,
  Tooltip,
} from '@blueprintjs/core';
import { IconNames } from '@blueprintjs/icons';
import _ from 'lodash';
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDispatch, useSelector } from 'react-redux';

import styles from './AudienceAndMusicians.module.css';
import { useLists } from './AudienceAndMusiciansHooks';
import { usePatch } from '../feathers/FeathersHooks';
import { selectRecordingState } from '../recording/recordingSlice';
import {
  selectRoom,
  setSecondsBetweenMusicians,
  selectAmHost,
} from '../room/roomSlice';

const SECONDS_BETWEEN_MUSICIANS_TOOLTIP = (
  <p style={{ margin: 0, maxWidth: 250 }}>
    This can be as low as 0.4 seconds, but if anyone in your room is
    experiencing audio cutting out occasionally, try setting this number higher
    to allow the data more time to travel over the internet.
  </p>
);

function getStyle({ draggableStyle, virtualStyle, isDragging }) {
  // If you don't want any spacing between your items
  // then you could just return this.
  // I do a little bit of magic to have some nice visual space
  // between the row items
  const combined = {
    ...virtualStyle,
    ...draggableStyle,
  };

  // Being lazy: this is defined in our css file
  const grid = 8;

  // when dragging we want to use the draggable style for placement, otherwise use the virtual style
  const result = {
    ...combined,
    width: isDragging
      ? draggableStyle.width
      : `calc(${combined.width} - ${grid * 2}px)`,
    marginBottom: grid,
    ...(isDragging
      ? {
          // NOTE(gnewman): These colors were picked from what an outlined
          // activated bp3-button looks like over the component. The native
          // colors are translucent, so we use these hardcoded values while
          // dragging so that musicians can be truly opaque and won't look
          // janky when they overlap.
          backgroundColor: 'rgb(83, 99, 112)',
          borderColor: 'rgb(152, 161, 170)',
        }
      : {}),
    color: '#f5f8fa',
  };

  return result;
}

function Person({
  provided,
  item,
  style,
  isDragging,
  disabled = false,
  renderLoopbackReminder = false,
}) {
  return (
    <>
      <div
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        ref={provided.innerRef}
        style={getStyle({
          draggableStyle: provided.draggableProps.style,
          virtualStyle: style,
          isDragging,
        })}
        className={
          styles.person +
          ' bp3-button bp3-outlined' +
          (disabled ? ' bp3-disabled' : '')
        }
      >
        {item.name}
      </div>
      {renderLoopbackReminder && (
        <span
          className={Classes.DARK + ' ' + styles.loopbackReminder}
          style={{
            left: provided.draggableProps.style.left,
            transform: provided.draggableProps.style.transform,
            zIndex: provided.draggableProps.style.zIndex,
            top: provided.draggableProps.style.top + 35,
            transition: provided.draggableProps.style.transition,
          }}
        >
          <Icon
            icon="warning-sign"
            color="#ffb466"
            style={{ marginRight: 5 }}
          />
          <span style={{ fontWeight: 'bold' }}>{item.name}</span> must set
          loopback latency!
        </span>
      )}
    </>
  );
}

function PersonList({
  column,
  isDropDisabled,
  musicianLoopbackIsUnset,
  isDragDisabled = false,
}) {
  return (
    <Droppable
      droppableId={column.id}
      renderClone={(provided, snapshot, rubric) => (
        <Person
          provided={provided}
          isDragging={snapshot.isDragging}
          item={column.items[rubric.source.index]}
          style={{ left: 8 }}
          renderLoopbackReminder={
            musicianLoopbackIsUnset &&
            snapshot.draggingOver !== 'audience' &&
            snapshot.isDropAnimating === false
          }
        />
      )}
      isDropDisabled={isDropDisabled}
    >
      {(provided, snapshot) => (
        <div ref={provided.innerRef} className={styles.personList}>
          {_.map(column.items, (item, index) => (
            <Draggable
              draggableId={item.id}
              index={index}
              key={item.id}
              isDragDisabled={isDragDisabled}
            >
              {provided => (
                <Person
                  provided={provided}
                  item={item}
                  style={{ left: 8 }}
                  isDragging={false}
                  disabled={isDragDisabled}
                />
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default function() {
  const {
    audienceColumn,
    musiciansColumn,
    onDragStart,
    onDragEnd,
    dragSourceId,
    musicianLoopbackIsUnset,
  } = useLists();

  const dispatch = useDispatch();
  const recordingState = useSelector(selectRecordingState);
  const { secondsBetweenMusicians, id: roomId } = useSelector(selectRoom);
  const amHost = useSelector(selectAmHost);

  const [patchRoom] = usePatch('rooms');

  const musiciansLocked = recordingState !== 'stopped';

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        <H4>Session</H4>
        <div
          style={{
            marginBottom: 10,
            marginLeft: 'auto',
            display: 'flex',
            flexDirection: 'row',
            maxWidth: 180,
          }}
        >
          <NumericInput
            buttonPosition="none"
            min={0.4}
            max={6}
            value={secondsBetweenMusicians || ''}
            selectAllOnFocus
            disabled={!amHost || musiciansLocked}
            onBlur={() => {
              const value = secondsBetweenMusicians;
              const newValue = value < 0.4 ? 0.4 : value > 6 ? 6 : value;
              dispatch(
                setSecondsBetweenMusicians({
                  secondsBetweenMusicians: newValue,
                })
              );
              patchRoom(roomId, { secondsBetweenMusicians: newValue });
            }}
            onValueChange={value =>
              dispatch(
                setSecondsBetweenMusicians({
                  secondsBetweenMusicians: value,
                })
              )
            }
            style={{ width: 40 }}
          />
          <Tooltip content={SECONDS_BETWEEN_MUSICIANS_TOOLTIP}>
            <span
              style={{
                // We need to do some styling gymnastics to make the underline
                // work well for a multiline span
                display: 'block',
                marginLeft: 5,
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
                cursor: 'help',
              }}
            >
              seconds between musicians
            </span>
          </Tooltip>
        </div>
      </div>
      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <Card
            elevation={2}
            className={styles.listCard}
            style={{
              width: 180 - 12,
              backgroundColor: Colors.DARK_GRAY5,
              marginRight: 8,
            }}
          >
            <H5
              style={{
                padding: 10,
                margin: 0,
                backgroundColor: Colors.DARK_GRAY3,
              }}
            >
              Standby
            </H5>
            <div className={styles.listContainer} style={{ paddingLeft: 4 }}>
              <PersonList
                column={audienceColumn}
                isDropDisabled={
                  dragSourceId === musiciansColumn.id &&
                  audienceColumn.items.length === 8
                }
                musicianLoopbackIsUnset={musicianLoopbackIsUnset}
              />
            </div>
          </Card>
          <Card elevation={2} className={styles.listCard}>
            <H5
              style={{
                padding: 10,
                margin: 0,
                backgroundColor: Colors.DARK_GRAY3,
              }}
            >
              {musiciansLocked && (
                <Icon
                  icon={IconNames.LOCK}
                  iconSize={10}
                  style={{
                    position: 'relative',
                    bottom: 4,
                    right: 4,
                  }}
                />
              )}
              Musician chain
            </H5>
            <div className={styles.listContainer}>
              <PersonList
                column={musiciansColumn}
                isDropDisabled={
                  (dragSourceId === audienceColumn.id &&
                    musiciansColumn.items.length === 8) ||
                  musiciansLocked ||
                  musicianLoopbackIsUnset
                }
                musicianLoopbackIsUnset={musicianLoopbackIsUnset}
                isDragDisabled={musiciansLocked}
              />
              <div className={styles.listHighlightsContainer}>
                {_.map(_.range(8), index => (
                  <div
                    key={index}
                    className={styles.listHighlight}
                    style={{
                      backgroundColor:
                        index % 2 ? Colors.DARK_GRAY5 : Colors.DARK_GRAY4,
                    }}
                  >
                    <span
                      className={styles.listHighlightIndex}
                      style={{
                        color: index % 2 ? Colors.GRAY2 : Colors.GRAY1,
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </DragDropContext>
    </Card>
  );
}
