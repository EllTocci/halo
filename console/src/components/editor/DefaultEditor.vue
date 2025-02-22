<script lang="ts" setup>
import {
  Extension,
  RichTextEditor,
  ExtensionBlockquote,
  ExtensionBold,
  ExtensionBulletList,
  ExtensionCode,
  ExtensionDocument,
  ExtensionDropcursor,
  ExtensionGapcursor,
  ExtensionHardBreak,
  ExtensionHeading,
  ExtensionHistory,
  ExtensionHorizontalRule,
  ExtensionItalic,
  ExtensionOrderedList,
  ExtensionStrike,
  ExtensionText,
  ExtensionImage,
  ExtensionTaskList,
  ExtensionLink,
  ExtensionTextAlign,
  ExtensionUnderline,
  ExtensionTable,
  ExtensionSubscript,
  ExtensionSuperscript,
  ExtensionPlaceholder,
  ExtensionHighlight,
  ExtensionCommands,
  ExtensionIframe,
  ExtensionVideo,
  ExtensionAudio,
  ExtensionCodeBlock,
  ExtensionFontSize,
  ExtensionColor,
  ExtensionIndent,
  lowlight,
  type AnyExtension,
  Editor,
  ToolboxItem,
  ExtensionDraggable,
  ExtensionColumns,
  ExtensionColumn,
  ExtensionNodeSelected,
  ExtensionTrailingNode,
} from "@halo-dev/richtext-editor";
import {
  IconCalendar,
  IconCharacterRecognition,
  IconFolder,
  IconLink,
  IconUserFollow,
  Toast,
  VTabItem,
  VTabs,
} from "@halo-dev/components";
import AttachmentSelectorModal from "@console/modules/contents/attachments/components/AttachmentSelectorModal.vue";
import ExtensionCharacterCount from "@tiptap/extension-character-count";
import MdiFormatHeader1 from "~icons/mdi/format-header-1";
import MdiFormatHeader2 from "~icons/mdi/format-header-2";
import MdiFormatHeader3 from "~icons/mdi/format-header-3";
import MdiFormatHeader4 from "~icons/mdi/format-header-4";
import MdiFormatHeader5 from "~icons/mdi/format-header-5";
import MdiFormatHeader6 from "~icons/mdi/format-header-6";
import {
  inject,
  markRaw,
  nextTick,
  ref,
  watch,
  onMounted,
  shallowRef,
  type ComputedRef,
} from "vue";
import { formatDatetime } from "@/utils/date";
import { useAttachmentSelect } from "@console/modules/contents/attachments/composables/use-attachment";
import { apiClient } from "@/utils/api-client";
import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import type { Attachment } from "@halo-dev/api-client";
import { useFetchAttachmentPolicy } from "@console/modules/contents/attachments/composables/use-attachment-policy";
import { useI18n } from "vue-i18n";
import { i18n } from "@/locales";
import { OverlayScrollbarsComponent } from "overlayscrollbars-vue";
import { usePluginModuleStore } from "@/stores/plugin";
import type { PluginModule } from "@halo-dev/console-shared";
import { useDebounceFn } from "@vueuse/core";
import { onBeforeUnmount } from "vue";
import { generateAnchor } from "@/utils/anchor";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    raw?: string;
    content: string;
  }>(),
  {
    raw: "",
    content: "",
  }
);

const emit = defineEmits<{
  (event: "update:raw", value: string): void;
  (event: "update:content", value: string): void;
  (event: "update", value: string): void;
}>();

const owner = inject<ComputedRef<string | undefined>>("owner");
const publishTime = inject<ComputedRef<string | undefined>>("publishTime");
const permalink = inject<ComputedRef<string | undefined>>("permalink");

interface HeadingNode {
  id: string;
  level: number;
  text: string;
}

const headingIcons = {
  1: markRaw(MdiFormatHeader1),
  2: markRaw(MdiFormatHeader2),
  3: markRaw(MdiFormatHeader3),
  4: markRaw(MdiFormatHeader4),
  5: markRaw(MdiFormatHeader5),
  6: markRaw(MdiFormatHeader6),
};

const headingNodes = ref<HeadingNode[]>();
const selectedHeadingNode = ref<HeadingNode>();
const extraActiveId = ref("toc");
const attachmentSelectorModal = ref(false);

const editor = shallowRef<Editor>();

const { pluginModules } = usePluginModuleStore();

onMounted(() => {
  const extensionsFromPlugins: AnyExtension[] = [];
  pluginModules.forEach((pluginModule: PluginModule) => {
    const { extensionPoints } = pluginModule;
    if (!extensionPoints?.["default:editor:extension:create"]) {
      return;
    }

    const extensions = extensionPoints[
      "default:editor:extension:create"
    ]() as [];

    extensionsFromPlugins.push(...extensions);
  });

  // debounce OnUpdate
  const debounceOnUpdate = useDebounceFn(() => {
    const html = editor.value?.getHTML() + "";
    emit("update:raw", html);
    emit("update:content", html);
    emit("update", html);
  }, 250);

  editor.value = new Editor({
    content: props.raw,
    extensions: [
      ExtensionBlockquote,
      ExtensionBold,
      ExtensionBulletList,
      ExtensionCode,
      ExtensionDocument,
      ExtensionDropcursor.configure({
        width: 2,
        class: "dropcursor",
        color: "skyblue",
      }),
      ExtensionGapcursor,
      ExtensionHardBreak,
      ExtensionHeading,
      ExtensionHistory,
      ExtensionHorizontalRule,
      ExtensionItalic,
      ExtensionOrderedList,
      ExtensionStrike,
      ExtensionText,
      ExtensionImage.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          loading: "lazy",
        },
      }),
      ExtensionTaskList,
      ExtensionLink.configure({
        autolink: true,
        openOnClick: false,
      }),
      ExtensionTextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ExtensionUnderline,
      ExtensionTable.configure({
        resizable: true,
      }),
      ExtensionSubscript,
      ExtensionSuperscript,
      ExtensionPlaceholder.configure({
        placeholder: t(
          "core.components.default_editor.extensions.placeholder.options.placeholder"
        ),
      }),
      ExtensionHighlight,
      ExtensionCommands,
      ExtensionCodeBlock.configure({
        lowlight,
      }),
      ExtensionIframe,
      ExtensionVideo,
      ExtensionAudio,
      ExtensionCharacterCount,
      ExtensionFontSize,
      ExtensionColor,
      ExtensionIndent,
      ...extensionsFromPlugins,
      Extension.create({
        addGlobalAttributes() {
          return [
            {
              types: ["heading"],
              attributes: {
                id: {
                  default: null,
                },
              },
            },
          ];
        },
      }),
      Extension.create({
        addOptions() {
          return {
            getToolboxItems({ editor }: { editor: Editor }) {
              return [
                {
                  priority: 0,
                  component: markRaw(ToolboxItem),
                  props: {
                    editor,
                    icon: markRaw(IconFolder),
                    title: i18n.global.t(
                      "core.components.default_editor.toolbox.attachment"
                    ),
                    action: () => (attachmentSelectorModal.value = true),
                  },
                },
              ];
            },
          };
        },
      }),
      ExtensionDraggable,
      ExtensionColumns,
      ExtensionColumn,
      ExtensionNodeSelected,
      ExtensionTrailingNode,
    ],
    autofocus: "start",
    onUpdate: () => {
      debounceOnUpdate();
      nextTick(() => {
        handleGenerateTableOfContent();
      });
    },
    editorProps: {
      handleDrop: (view, event: DragEvent, _, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files) {
          const images = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith("image/")
          ) as File[];

          if (images.length === 0) {
            return;
          }

          event.preventDefault();

          images.forEach((file, index) => {
            uploadQueue.push({
              file,
              process: (url: string) => {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({
                  left: event.clientX,
                  top: event.clientY,
                });

                if (!coordinates) return;

                const node = schema.nodes.image.create({
                  src: url,
                });

                const transaction = view.state.tr.insert(
                  coordinates.pos + index,
                  node
                );

                editor.value?.view.dispatch(transaction);
              },
            });
          });

          return true;
        }
        return false;
      },
      handlePaste: (view, event: ClipboardEvent) => {
        const types = Array.from(event.clipboardData?.types || []);

        if (["text/plain", "text/html"].includes(types[0])) {
          return;
        }

        const images = Array.from(event.clipboardData?.items || [])
          .map((item) => {
            return item.getAsFile();
          })
          .filter((file) => {
            return file && file.type.startsWith("image/");
          }) as File[];

        if (images.length === 0) {
          return;
        }

        event.preventDefault();

        images.forEach((file) => {
          uploadQueue.push({
            file,
            process: (url: string) => {
              editor.value
                ?.chain()
                .focus()
                .insertContent([
                  {
                    type: "image",
                    attrs: {
                      src: url,
                    },
                  },
                ])
                .run();
            },
          });
        });
      },
    },
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

// image drag and paste upload
const { policies } = useFetchAttachmentPolicy();

type Task = {
  file: File;
  process: (permalink: string) => void;
};

const uploadQueue: queueAsPromised<Task> = fastq.promise(asyncWorker, 1);

async function asyncWorker(arg: Task): Promise<void> {
  if (!policies.value?.length) {
    Toast.warning(
      t(
        "core.components.default_editor.upload_attachment.toast.no_available_policy"
      )
    );
    return;
  }

  const { data: attachmentData } = await apiClient.attachment.uploadAttachment({
    file: arg.file,
    policyName: policies.value[0].metadata.name,
  });

  const permalink = await handleFetchPermalink(attachmentData, 3);

  if (permalink) {
    arg.process(permalink);
  }
}

const handleFetchPermalink = async (
  attachment: Attachment,
  maxRetry: number
): Promise<string | undefined> => {
  if (maxRetry === 0) {
    Toast.error(
      t(
        "core.components.default_editor.upload_attachment.toast.failed_fetch_permalink",
        { display_name: attachment.spec.displayName }
      )
    );
    return undefined;
  }

  const { data } =
    await apiClient.extension.storage.attachment.getstorageHaloRunV1alpha1Attachment(
      {
        name: attachment.metadata.name,
      }
    );

  if (data.status?.permalink) {
    return data.status.permalink;
  }

  return await new Promise((resolve) => {
    const timer = setTimeout(() => {
      const permalink = handleFetchPermalink(attachment, maxRetry - 1);
      clearTimeout(timer);
      resolve(permalink);
    }, 300);
  });
};

const handleGenerateTableOfContent = () => {
  if (!editor.value) {
    return;
  }

  const headings: HeadingNode[] = [];
  const transaction = editor.value.state.tr;

  editor.value.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const id = generateAnchor(node.textContent);

      if (node.attrs.id !== id) {
        transaction?.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          id,
        });
      }

      headings.push({
        level: node.attrs.level,
        text: node.textContent,
        id,
      });
    }
  });

  transaction.setMeta("addToHistory", false);
  transaction.setMeta("preventUpdate", true);

  editor.value.view.dispatch(transaction);

  headingNodes.value = headings;

  if (!selectedHeadingNode.value) {
    selectedHeadingNode.value = headings[0];
  }
};

const handleSelectHeadingNode = (node: HeadingNode) => {
  selectedHeadingNode.value = node;
  document.getElementById(node.id)?.scrollIntoView({ behavior: "smooth" });
};

const { onAttachmentSelect } = useAttachmentSelect(editor);

watch(
  () => props.raw,
  () => {
    if (props.raw !== editor.value?.getHTML()) {
      editor.value?.commands.setContent(props.raw);
      nextTick(() => {
        handleGenerateTableOfContent();
      });
    }
  },
  {
    immediate: true,
  }
);

// fixme: temporary solution
const currentLocale = i18n.global.locale.value as
  | "zh-CN"
  | "en"
  | "zh"
  | "en-US";
</script>

<template>
  <div>
    <AttachmentSelectorModal
      v-model:visible="attachmentSelectorModal"
      @select="onAttachmentSelect"
    />
    <RichTextEditor v-if="editor" :editor="editor" :locale="currentLocale">
      <template #extra>
        <OverlayScrollbarsComponent
          element="div"
          :options="{ scrollbars: { autoHide: 'scroll' } }"
          class="h-full border-l bg-white"
          defer
        >
          <VTabs v-model:active-id="extraActiveId" type="outline">
            <VTabItem
              id="toc"
              :label="$t('core.components.default_editor.tabs.toc.title')"
            >
              <div class="p-1 pt-0">
                <ul v-if="headingNodes?.length" class="space-y-1">
                  <li
                    v-for="(node, index) in headingNodes"
                    :key="index"
                    :class="[
                      { 'bg-gray-100': node.id === selectedHeadingNode?.id },
                    ]"
                    class="group cursor-pointer truncate rounded-base px-1.5 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    @click="handleSelectHeadingNode(node)"
                  >
                    <div
                      :style="{
                        paddingLeft: `${(node.level - 1) * 0.8}rem`,
                      }"
                      class="flex items-center gap-2"
                    >
                      <component
                        :is="headingIcons[node.level]"
                        class="h-4 w-4 rounded-sm bg-gray-100 p-0.5 group-hover:bg-white"
                        :class="[
                          { '!bg-white': node.id === selectedHeadingNode?.id },
                        ]"
                      />
                      <span class="flex-1 truncate">{{ node.text }}</span>
                    </div>
                  </li>
                </ul>
                <div v-else class="flex flex-col items-center py-10">
                  <span class="text-sm text-gray-600">
                    {{ $t("core.components.default_editor.tabs.toc.empty") }}
                  </span>
                </div>
              </div>
            </VTabItem>
            <VTabItem
              id="information"
              :label="$t('core.components.default_editor.tabs.detail.title')"
            >
              <div class="flex flex-col gap-2 p-1 pt-0">
                <div class="grid grid-cols-2 gap-2">
                  <div
                    class="group flex cursor-pointer flex-col gap-y-5 rounded-md bg-gray-100 px-1.5 py-1 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div
                        class="text-sm text-gray-500 group-hover:text-gray-900"
                      >
                        {{
                          $t(
                            "core.components.default_editor.tabs.detail.fields.character_count"
                          )
                        }}
                      </div>
                      <div class="rounded bg-gray-200 p-0.5">
                        <IconCharacterRecognition
                          class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        />
                      </div>
                    </div>
                    <div class="text-base font-medium text-gray-900">
                      {{ editor.storage.characterCount.characters() }}
                    </div>
                  </div>
                  <div
                    class="group flex cursor-pointer flex-col gap-y-5 rounded-md bg-gray-100 px-1.5 py-1 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div
                        class="text-sm text-gray-500 group-hover:text-gray-900"
                      >
                        {{
                          $t(
                            "core.components.default_editor.tabs.detail.fields.word_count"
                          )
                        }}
                      </div>
                      <div class="rounded bg-gray-200 p-0.5">
                        <IconCharacterRecognition
                          class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        />
                      </div>
                    </div>
                    <div class="text-base font-medium text-gray-900">
                      {{ editor.storage.characterCount.words() }}
                    </div>
                  </div>
                </div>

                <div v-if="publishTime" class="grid grid-cols-1 gap-2">
                  <div
                    class="group flex cursor-pointer flex-col gap-y-5 rounded-md bg-gray-100 px-1.5 py-1 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div
                        class="text-sm text-gray-500 group-hover:text-gray-900"
                      >
                        {{
                          $t(
                            "core.components.default_editor.tabs.detail.fields.publish_time"
                          )
                        }}
                      </div>
                      <div class="rounded bg-gray-200 p-0.5">
                        <IconCalendar
                          class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        />
                      </div>
                    </div>
                    <div class="text-base font-medium text-gray-900">
                      {{
                        formatDatetime(publishTime) ||
                        $t(
                          "core.components.default_editor.tabs.detail.fields.draft"
                        )
                      }}
                    </div>
                  </div>
                </div>
                <div v-if="owner" class="grid grid-cols-1 gap-2">
                  <div
                    class="group flex cursor-pointer flex-col gap-y-5 rounded-md bg-gray-100 px-1.5 py-1 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div
                        class="text-sm text-gray-500 group-hover:text-gray-900"
                      >
                        {{
                          $t(
                            "core.components.default_editor.tabs.detail.fields.owner"
                          )
                        }}
                      </div>
                      <div class="rounded bg-gray-200 p-0.5">
                        <IconUserFollow
                          class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        />
                      </div>
                    </div>
                    <div class="text-base font-medium text-gray-900">
                      {{ owner }}
                    </div>
                  </div>
                </div>
                <div v-if="permalink" class="grid grid-cols-1 gap-2">
                  <div
                    class="group flex cursor-pointer flex-col gap-y-5 rounded-md bg-gray-100 px-1.5 py-1 transition-all"
                  >
                    <div class="flex items-center justify-between">
                      <div
                        class="text-sm text-gray-500 group-hover:text-gray-900"
                      >
                        {{
                          $t(
                            "core.components.default_editor.tabs.detail.fields.permalink"
                          )
                        }}
                      </div>
                      <div class="rounded bg-gray-200 p-0.5">
                        <IconLink
                          class="h-4 w-4 text-gray-600 group-hover:text-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <a
                        :href="permalink"
                        :title="permalink"
                        target="_blank"
                        class="text-sm text-gray-900 hover:text-blue-600"
                      >
                        {{ permalink }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </VTabItem>
          </VTabs>
        </OverlayScrollbarsComponent>
      </template>
    </RichTextEditor>
  </div>
</template>
