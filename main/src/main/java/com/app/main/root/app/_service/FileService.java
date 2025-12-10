package com.app.main.root.app._service;
import com.app.main.root.app._db.DbManager;
import org.springframework.stereotype.Service;
import com.app.main.root.app._data.MimeToDb;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.multipart.MultipartFile;
import javax.sql.DataSource;
import java.io.IOException;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FileService {
    private final Map<String, JdbcTemplate> jdbcTemplates;
    private final DbManager dbManager;
    private final ServiceManager serviceManager;

    public FileService(
        Map<String, JdbcTemplate> jdbcTemplates,
        @Lazy ServiceManager serviceManager,
        @Lazy DbManager dbManager
    ) {
        this.jdbcTemplates = jdbcTemplates;
        this.serviceManager = serviceManager;
        this.dbManager = dbManager;
    }


}
