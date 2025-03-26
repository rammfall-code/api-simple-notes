import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { Type } from '@sinclair/typebox';
import fastifyMultipart from '@fastify/multipart';
import { scoreModule } from './score/index.js';

const server = fastify({
  logger: true,
}).withTypeProvider();

server.register(fastifyCors, {
  methods: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'],
});
server.register(fastifySwagger);
server.register(fastifySwaggerUi);
server.register(fastifyMultipart, {
  attachFieldsToBody: 'keyValues',
});

/**
 * @type {*[]}
 */
let notes = [
  {
    id: crypto.randomUUID(),
    text: 'First note',
  },
];

const getNotesDto = Type.Partial(
  Type.Object({
    query: Type.String({
      minLength: 4,
      maxLength: 100,
    }),
  }),
  {
    $id: 'GetNotesDTO',
  },
);

const noteSchema = Type.Object(
  {
    id: Type.String(),
    text: Type.String({
      minLength: 6,
      maxLength: 300,
    }),
  },
  {
    $id: 'NoteDTO',
  },
);

const updatePayload = Type.Pick(noteSchema, ['text'], {
  $id: 'CreateUpdatePayloadDTO',
});

const deletePayload = Type.Pick(noteSchema, ['id'], {
  $id: 'IdPathPayloadDTO',
});

const noteList = Type.Array(Type.Ref(noteSchema), {
  $id: 'NotesResponseListDTO',
});

server.addSchema(getNotesDto);
server.addSchema(noteSchema);
server.addSchema(noteList);
server.addSchema(updatePayload);
server.addSchema(deletePayload);

server.register(
  (instance, opts, done) => {
    instance.register(scoreModule, {
      prefix: '/score',
    });

    instance.get(
      '/notes',
      {
        schema: {
          tags: ['Notes'],
          querystring: Type.Ref(getNotesDto),
          response: {
            200: Type.Ref(noteList),
          },
        },
      },
      (request, reply) => {
        const { query } = request.query;

        if (!query) {
          return notes;
        }

        return notes.filter((note) =>
          note.text.toLowerCase().includes(query.toLowerCase()),
        );
      },
    );

    instance.post(
      '/notes',
      {
        schema: {
          tags: ['Notes'],
          body: Type.Ref(updatePayload),
          response: {
            200: Type.Ref(noteSchema),
          },
        },
      },
      (request, reply) => {
        const { text } = request.body;
        const note = {
          id: crypto.randomUUID(),
          text,
        };
        notes.push(note);

        return note;
      },
    );

    instance.patch(
      '/notes/:id',
      {
        schema: {
          tags: ['Notes'],
          params: Type.Ref(deletePayload),
          body: Type.Ref(updatePayload),
          response: {
            200: Type.Ref(noteSchema),
          },
        },
      },
      (request, reply) => {
        const { id } = request.params;
        const { text } = request.body;

        const note = notes.find((note) => note.id === id);

        if (!note) {
          return reply.status(404).send({
            message: 'NotFound',
          });
        }

        note.text = text;

        return note;
      },
    );

    instance.delete(
      '/notes/:id',
      {
        schema: {
          tags: ['Notes'],
          params: Type.Ref(deletePayload),
          response: {
            200: Type.Ref(noteSchema),
          },
        },
      },
      (request, reply) => {
        const { id } = request.params;

        const note = notes.find((note) => note.id === id);

        if (!note) {
          return reply.status(404).send({
            message: 'NotFound',
          });
        }

        notes = notes.filter((item) => item.id !== id);

        return note;
      },
    );

    done();
  },
  {
    prefix: '/api/v1',
  },
);

server
  .listen({
    port: 4400,
  })
  .then(() => {
    console.log('');
  });
